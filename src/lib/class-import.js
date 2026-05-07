// ─── Class import — pure logic ──────────────────────────────────────────
// Validates the JSON shape produced by EditClassModal's export, then
// recreates the class in the DB. UI lives in ImportClassModal — this
// module never touches DOM and never reads from `window`.
//
// On success: returns the inserted class row.
// On failure: throws an Error with a translated message via the `t` map
// passed in by the caller (so error copy can be localized without
// hardcoding strings here).
//
// Design choices (see the planning conversation):
//   - Strict schema check: "clasloop.class.v1" only. Future versions get
//     migration shims here, not in callers.
//   - Per-deck unit_idx that points outside `units` falls back to
//     unit_id=null (no unit) instead of failing the whole import.
//   - cover_image_url is copied verbatim — works if the importer owns
//     the same Storage bucket. Cross-account imports may end up with
//     broken covers, which is acceptable for v1.
//   - Atomicity: Supabase JS has no client-side transactions, so we do
//     a best-effort sequence (class → units → decks) and DELETE the
//     class on partial failure. CASCADE cleans units + decks.

import { supabase } from "./supabase";

// Hard limits to prevent runaway imports. A real class is typically tens
// of decks; 200/50 covers heavy users with margin and bounds the work.
export const IMPORT_LIMITS = {
  MAX_DECKS: 200,
  MAX_UNITS: 50,
};

// Allowed enum values mirrored from the schema. We validate against these
// here too so a tampered JSON can't slip a value past Postgres' check
// constraint (which would error mid-import).
const VALID_SECTIONS = new Set(["warmup", "exit_ticket", "general_review"]);
const VALID_COLORS = new Set([
  "auto", "blue", "purple", "green", "orange", "pink", "yellow", "red", "gray",
]);

// ─── Errors ─────────────────────────────────────────────────────────────
// We surface specific kinds so the modal can tailor the message. The
// `code` is stable; the `message` falls back to English if no t map.
export class ImportError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

// ─── Validation ─────────────────────────────────────────────────────────
// Pure function — takes the parsed JSON, returns nothing on success,
// throws ImportError on any failure. Doing this BEFORE any DB write so
// we never end up with a half-imported class because of bad data.
export function validateImportJson(json) {
  if (!json || typeof json !== "object") {
    throw new ImportError("not-object", "File doesn't look like a Clasloop class export.");
  }
  if (json.schema !== "clasloop.class.v1") {
    throw new ImportError(
      "wrong-schema",
      "This file isn't a v1 Clasloop class export.",
      `Found schema="${json.schema}"`
    );
  }
  // class block
  if (!json.class || typeof json.class !== "object") {
    throw new ImportError("no-class", "Missing class metadata.");
  }
  const c = json.class;
  if (typeof c.name !== "string" || !c.name.trim()) {
    throw new ImportError("invalid-class-name", "Class name is missing or empty.");
  }
  if (typeof c.subject !== "string" || !c.subject.trim()) {
    throw new ImportError("invalid-class-subject", "Class subject is missing.");
  }
  if (typeof c.grade !== "string" || !c.grade.trim()) {
    throw new ImportError("invalid-class-grade", "Class grade is missing.");
  }
  if (c.color_id != null && !VALID_COLORS.has(c.color_id)) {
    throw new ImportError("invalid-color", `Unknown color "${c.color_id}".`);
  }
  // arrays
  if (!Array.isArray(json.units)) {
    throw new ImportError("invalid-units", "Units block must be an array.");
  }
  if (!Array.isArray(json.decks)) {
    throw new ImportError("invalid-decks", "Decks block must be an array.");
  }
  // limits
  if (json.units.length > IMPORT_LIMITS.MAX_UNITS) {
    throw new ImportError(
      "too-many-units",
      `Too many units (${json.units.length}). Max is ${IMPORT_LIMITS.MAX_UNITS}.`
    );
  }
  if (json.decks.length > IMPORT_LIMITS.MAX_DECKS) {
    throw new ImportError(
      "too-many-decks",
      `Too many decks (${json.decks.length}). Max is ${IMPORT_LIMITS.MAX_DECKS}.`
    );
  }
  // per-unit
  json.units.forEach((u, i) => {
    if (!u || typeof u !== "object") {
      throw new ImportError("invalid-unit", `Unit at index ${i} is not an object.`);
    }
    if (typeof u.name !== "string" || !u.name.trim()) {
      throw new ImportError("invalid-unit", `Unit at index ${i} has no name.`);
    }
    if (!VALID_SECTIONS.has(u.section)) {
      throw new ImportError("invalid-unit", `Unit "${u.name}" has invalid section "${u.section}".`);
    }
    // idx is what decks reference; allow either explicit numeric or array index
    if (u.idx != null && (typeof u.idx !== "number" || !Number.isInteger(u.idx))) {
      throw new ImportError("invalid-unit", `Unit "${u.name}" has invalid idx.`);
    }
  });
  // per-deck
  json.decks.forEach((d, i) => {
    if (!d || typeof d !== "object") {
      throw new ImportError("invalid-deck", `Deck at index ${i} is not an object.`);
    }
    if (typeof d.title !== "string" || !d.title.trim()) {
      throw new ImportError("invalid-deck", `Deck at index ${i} has no title.`);
    }
    if (!Array.isArray(d.questions)) {
      throw new ImportError("invalid-deck", `Deck "${d.title}" has no questions array.`);
    }
    if (d.section != null && !VALID_SECTIONS.has(d.section)) {
      throw new ImportError("invalid-deck", `Deck "${d.title}" has invalid section "${d.section}".`);
    }
    if (d.unit_idx != null && (typeof d.unit_idx !== "number" || !Number.isInteger(d.unit_idx))) {
      throw new ImportError("invalid-deck", `Deck "${d.title}" has invalid unit_idx.`);
    }
  });
}

// ─── Import ─────────────────────────────────────────────────────────────
// Creates the class, then its units, then its decks. Each step is a
// separate awaited call. On any failure after the class is created, we
// DELETE the class — CASCADE on units and decks (FK on class_id) does
// the rest, so we never leave half-imported data behind.
//
// `name` is the user-edited class name from the preview form. The other
// fields come from json.class verbatim.
//
// Returns the inserted classes row.
export async function importClassFromJson({ json, userId, name }) {
  validateImportJson(json);

  const classMeta = json.class;
  const finalName = (name && name.trim()) || classMeta.name.trim();

  // ── 1. Generate code via RPC, same as CreateClassModal does for fresh
  //    classes. Guarantees friendly format + uniqueness.
  const { data: rpcCode, error: rpcErr } = await supabase.rpc("generate_class_code", {
    p_subject: classMeta.subject,
    p_grade: classMeta.grade,
  });
  if (rpcErr || !rpcCode) {
    throw new ImportError(
      "code-gen-failed",
      rpcErr?.message || "Could not generate class code."
    );
  }

  // ── 2. Insert the class
  const { data: insertedClass, error: classErr } = await supabase
    .from("classes")
    .insert({
      teacher_id: userId,
      name: finalName,
      subject: classMeta.subject,
      grade: classMeta.grade,
      class_code: rpcCode,
      color_id: classMeta.color_id || "auto",
    })
    .select()
    .single();
  if (classErr || !insertedClass) {
    throw new ImportError(
      "class-insert-failed",
      classErr?.message || "Could not create class."
    );
  }
  const classId = insertedClass.id;

  // ── 3. Insert units, building idx → real id map for deck FK rebuild.
  // Empty units array → skip entirely (rare but valid: a fresh class with
  // decks all in "Unsorted").
  const idxToUnitId = new Map();
  if (json.units.length > 0) {
    const unitsPayload = json.units.map(u => ({
      class_id: classId,
      section: u.section,
      name: u.name.trim().slice(0, 60),
      position: typeof u.position === "number" ? u.position : 0,
    }));
    const { data: insertedUnits, error: unitsErr } = await supabase
      .from("units")
      .insert(unitsPayload)
      .select();
    if (unitsErr || !insertedUnits) {
      // Cleanup: delete the class so we don't leave it stranded.
      await supabase.from("classes").delete().eq("id", classId);
      throw new ImportError(
        "units-insert-failed",
        unitsErr?.message || "Could not create units."
      );
    }
    // Map old idx → new id. We rely on PostgREST returning rows in the
    // SAME ORDER they were inserted (true for current Supabase clients).
    // If that contract ever changes we'd need to match by name+section.
    json.units.forEach((u, i) => {
      const inserted = insertedUnits[i];
      if (!inserted) return;
      const idx = typeof u.idx === "number" ? u.idx : i;
      idxToUnitId.set(idx, inserted.id);
    });
  }

  // ── 4. Insert decks. Each deck: rebuild unit_id from unit_idx via the
  // map above. Invalid unit_idx → null (silent fallback per spec).
  if (json.decks.length > 0) {
    const decksPayload = json.decks.map(d => {
      let unitId = null;
      if (d.unit_idx != null && idxToUnitId.has(d.unit_idx)) {
        unitId = idxToUnitId.get(d.unit_idx);
      }
      const section = VALID_SECTIONS.has(d.section) ? d.section : "general_review";
      return {
        author_id: userId,
        class_id: classId,
        unit_id: unitId,
        section,
        title: (d.title || "Untitled").toString().trim().slice(0, 200),
        description: typeof d.description === "string" ? d.description : "",
        subject: typeof d.subject === "string" && d.subject ? d.subject : classMeta.subject,
        grade: typeof d.grade === "string" && d.grade ? d.grade : classMeta.grade,
        language: typeof d.language === "string" ? d.language : "",
        tags: Array.isArray(d.tags) ? d.tags.slice(0, 30) : [],
        questions: Array.isArray(d.questions) ? d.questions : [],
        position: typeof d.position === "number" ? d.position : 0,
        cover_color: typeof d.cover_color === "string" ? d.cover_color : null,
        cover_icon: typeof d.cover_icon === "string" ? d.cover_icon : null,
        cover_image_url: typeof d.cover_image_url === "string" ? d.cover_image_url : null,
        is_public: !!d.is_public,
        is_adapted: !!d.is_adapted,
      };
    });
    const { error: decksErr } = await supabase.from("decks").insert(decksPayload);
    if (decksErr) {
      // Cleanup: same as above. CASCADE on the class FK in units / decks
      // ensures everything goes with it.
      await supabase.from("classes").delete().eq("id", classId);
      throw new ImportError(
        "decks-insert-failed",
        decksErr.message || "Could not create decks."
      );
    }
  }

  return insertedClass;
}
