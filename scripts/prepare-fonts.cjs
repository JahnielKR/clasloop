#!/usr/bin/env node
// ─── prepare-fonts.cjs ───────────────────────────────────────────────────
//
// PR 82: descarga NotoSansKR TTF desde el repo oficial notofonts/noto-cjk
// y la convierte a base64 + módulo JS que jsPDF puede consumir directo.
//
// Por qué hace falta este paso:
//   El package @fontsource/noto-sans-kr sirve solo WOFF2, que jsPDF NO
//   soporta. jsPDF necesita TTF. Las URLs del CDN jsdelivr (que usábamos
//   antes) servían un .otf disfrazado de .ttf — esto causa el bug del PDF
//   donde TODOS los chars salen shifted -31 en ASCII.
//
// Por qué se commitea el archivo generado al repo:
//   Para que cualquiera pueda clonar y `npm run build` sin necesidad de
//   internet. La font queda como un módulo más del proyecto.
//
// Cuándo correr este script:
//   - Una vez al inicio (en el setup del proyecto)
//   - Si en el futuro Google actualiza NotoSansKR y queremos la versión nueva
//
// El archivo generado (src/lib/noto-sans-kr-data.js) pesa ~1.3MB en disco
// (base64 inflada). En el bundle final, Vite lo deja en un chunk separado
// que solo se baja cuando hace falta exportar un PDF coreano.

const fs = require("fs");
const path = require("path");
const https = require("https");

// SubsetTTF — versión recortada solo a chars hangul + latin básico.
// 100% compatible con jsPDF. ~700KB raw, ~1MB base64-encoded.
//
// Fuente: github.com/notofonts/noto-cjk path Sans/Variable/TTF/Subset/.
// Es el repo oficial de Google/notofonts. Sirve TTF puro (no .otf
// disfrazado), versionado, y estable.
const FONT_URL =
  "https://github.com/notofonts/noto-cjk/raw/main/Sans/Variable/TTF/Subset/NotoSansKR-VF.ttf";

const OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "src",
  "lib",
  "noto-sans-kr-data.js",
);

function download(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error("Too many redirects"));
      return;
    }
    https
      .get(url, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          // Follow redirect (GitHub raw URLs redirect to objects.githubusercontent.com)
          download(res.headers.location, redirects + 1).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function main() {
  console.log("Downloading NotoSansKR TTF from notofonts/noto-cjk...");
  const buf = await download(FONT_URL);
  console.log(`  ${buf.length} bytes downloaded`);

  // Verificación básica: TTF empieza con "\x00\x01\x00\x00" o "OTTO" (que sería OTF)
  // Si empieza con "OTTO", el archivo es OTF disfrazado, falla.
  const magic = buf.slice(0, 4).toString("ascii");
  const magicHex = Array.from(buf.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  console.log(`  Magic bytes: ${magicHex} ("${magic.replace(/[^\x20-\x7e]/g, ".")}")`);

  // TTF válido: 00 01 00 00 (TrueType) o 74 72 75 65 ("true")
  // Inválido: OTTO (CFF/OpenType)
  if (magic === "OTTO") {
    throw new Error(
      "Downloaded file is OTF, not TTF. jsPDF requires TTF. URL incorrect?",
    );
  }
  if (magicHex !== "00010000" && magic !== "true") {
    console.warn(
      `  ⚠️  Unexpected magic bytes — file may not be a valid TTF. Proceeding anyway.`,
    );
  }

  console.log("Encoding as base64...");
  const base64 = buf.toString("base64");
  console.log(`  ${base64.length} chars`);

  console.log(`Writing module to ${OUTPUT_PATH}...`);
  const moduleCode = `// ─── noto-sans-kr-data ───────────────────────────────────────────────────
//
// ⚠️  AUTO-GENERATED FILE. Do not edit by hand.
//
// Run \`npm run prepare-fonts\` to regenerate from the original TTF.
//
// This file embeds the NotoSansKR-Regular subset TTF as a base64 string,
// for use with jsPDF's addFileToVFS() / addFont() APIs.
//
// Why this exists:
//   jsPDF only supports TTF fonts. The previous lazy-load from a CDN was
//   fetching an .otf file (OpenType with CFF outlines), which jsPDF can't
//   parse correctly — caused all PDF characters to render with a -31 ASCII
//   shift (so "Clasloop" appeared as "$MBTMPPQ"). See PR 82.
//
// Why subset:
//   Full NotoSansKR is ~17MB. The subset variant covers hangul precomposed
//   syllables (U+AC00-U+D7A3) + basic latin/numbers, sufficient for our
//   exam PDFs.
//
// Size: ~${Math.round(buf.length / 1024)}KB raw, ~${Math.round(base64.length / 1024)}KB base64.
// Vite splits this into a separate chunk via dynamic import in pdf-fonts.js,
// so the bundle stays small when Korean isn't used.

export const NOTO_SANS_KR_BASE64 = ${JSON.stringify(base64)};
`;

  fs.writeFileSync(OUTPUT_PATH, moduleCode, "utf8");
  console.log(`  Wrote ${moduleCode.length} chars`);
  console.log("");
  console.log("✅ Done. Commit the generated file:");
  console.log("   git add src/lib/noto-sans-kr-data.js");
  console.log("   git commit -m 'PR 82: regenerate NotoSansKR font data'");
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
