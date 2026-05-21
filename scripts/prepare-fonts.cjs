#!/usr/bin/env node
// ─── prepare-fonts.cjs ───────────────────────────────────────────────────
//
// PR 82 (original): descarga NotoSansKR TTF desde el repo oficial
// notofonts/noto-cjk y la convierte a base64 + módulo JS que jsPDF
// puede consumir directo.
//
// PR 97 (subset fix): el path original `Sans/Variable/TTF/Subset/` ya
// no es un subset — ahora sirve la fuente variable completa (~10 MB
// raw, ~13.2 MB base64). El script ahora:
//   1. Descarga el variable font completo (URL upstream que SÍ
//      existe, aunque ya no sea un subset).
//   2. Instancia a wght=400 con fonttools (varLib.instancer).
//   3. Subset a Basic Latin (U+0020-007E) + Hangul Syllables
//      (U+AC00-D7A3) con pyftsubset.
//   4. Encode base64 + write module.
//
// Resultado: ~2.2 MB raw, ~3.1 MB base64 (76% más chico que sin
// subset). Suficiente para todos los textos posibles en exámenes
// Clasloop (latin + coreano).
//
// REQUIREMENTS:
//   - Python 3 + fonttools instalado:
//       pip install fonttools[ufo,lxml,woff,unicode]
//   - Si pyftsubset no existe, el script avisa y guarda el archivo
//     sin subset (te queda el blob grande pero funcional).
//
// El archivo generado (src/lib/noto-sans-kr-data.js) se commitea al
// repo para que cualquiera pueda clonar y `npm run build` sin
// necesidad de internet ni fonttools.

const fs = require("fs");
const path = require("path");
const https = require("https");
const os = require("os");
const { spawnSync } = require("child_process");

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

function checkCmd(cmd) {
  const probe = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(probe, [cmd], { stdio: "ignore" });
  return r.status === 0;
}

function runFontTools(inputPath, outputPath) {
  // Step 1: instance variable axes to wght=400
  console.log("  Step 1/2: instancing variable font to wght=400...");
  const instancedPath = inputPath + ".instanced.ttf";
  const instancer = spawnSync(
    "fonttools",
    ["varLib.instancer", inputPath, "wght=400", "-o", instancedPath],
    { encoding: "utf-8" },
  );
  if (instancer.status !== 0) {
    throw new Error(
      `varLib.instancer failed: ${instancer.stderr || instancer.stdout}`,
    );
  }
  console.log(
    `    instanced: ${fs.statSync(instancedPath).size} bytes`,
  );

  // Step 2: subset to basic latin + hangul syllables, drop unused tables
  console.log("  Step 2/2: subsetting (latin + hangul)...");
  const subset = spawnSync(
    "pyftsubset",
    [
      instancedPath,
      "--unicodes=U+0020-007E,U+AC00-D7A3",
      "--no-hinting",
      "--desubroutinize",
      "--drop-tables+=DSIG,GSUB,GPOS,GDEF,vmtx,VORG",
      `--output-file=${outputPath}`,
    ],
    { encoding: "utf-8" },
  );
  if (subset.status !== 0) {
    throw new Error(`pyftsubset failed: ${subset.stderr || subset.stdout}`);
  }

  try { fs.unlinkSync(instancedPath); } catch {}
}

async function main() {
  console.log("Downloading NotoSansKR variable font from notofonts/noto-cjk...");
  const sourceBuf = await download(FONT_URL);
  console.log(`  ${sourceBuf.length} bytes downloaded`);

  // Sanity: TTF magic
  const magicHex = Array.from(sourceBuf.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  console.log(`  Magic bytes: ${magicHex}`);
  if (magicHex !== "00010000" && sourceBuf.slice(0, 4).toString("ascii") !== "true") {
    throw new Error("Downloaded file is not a TTF (magic bytes wrong)");
  }

  // Decide: subset locally with pyftsubset, or skip?
  let finalBuf;
  if (checkCmd("pyftsubset") && checkCmd("fonttools")) {
    console.log("Subsetting with fonttools/pyftsubset...");
    const tmpDir = os.tmpdir();
    const sourcePath = path.join(tmpDir, "noto-source.ttf");
    const subsetPath = path.join(tmpDir, "noto-subset.ttf");
    fs.writeFileSync(sourcePath, sourceBuf);
    runFontTools(sourcePath, subsetPath);
    finalBuf = fs.readFileSync(subsetPath);
    console.log(
      `  Subset size: ${finalBuf.length} bytes ` +
        `(${Math.round((1 - finalBuf.length / sourceBuf.length) * 100)}% smaller)`,
    );
    try { fs.unlinkSync(sourcePath); } catch {}
    try { fs.unlinkSync(subsetPath); } catch {}
  } else {
    console.warn("");
    console.warn("⚠️  fonttools/pyftsubset NOT found in PATH.");
    console.warn("    The output will use the FULL variable font (~10 MB raw).");
    console.warn("    To get the proper subset (~2 MB), install fonttools:");
    console.warn("      pip install fonttools[ufo,lxml,woff,unicode]");
    console.warn("    …and re-run `npm run prepare-fonts`.");
    console.warn("");
    finalBuf = sourceBuf;
  }

  console.log("Encoding as base64...");
  const base64 = finalBuf.toString("base64");
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
// Why subset (PR 97):
//   Upstream variable font is ~10 MB. We instance to wght=400 and subset
//   to Basic Latin (U+0020-007E) + Hangul Syllables (U+AC00-D7A3) with
//   pyftsubset, dropping DSIG/GSUB/GPOS/GDEF/vmtx/VORG. Result: ~2.2 MB
//   raw (~3.1 MB base64), 76% smaller than the broken upstream.
//
// Size: ~${Math.round(finalBuf.length / 1024)}KB raw, ~${Math.round(base64.length / 1024)}KB base64.
// Vite splits this into a separate chunk via dynamic import in pdf-fonts.js,
// so the bundle stays small when Korean isn't used.

export const NOTO_SANS_KR_BASE64 = ${JSON.stringify(base64)};
`;

  fs.writeFileSync(OUTPUT_PATH, moduleCode, "utf8");
  console.log(`  Wrote ${moduleCode.length} chars`);
  console.log("");
  console.log("✅ Done. Commit the generated file:");
  console.log("   git add src/lib/noto-sans-kr-data.js");
  console.log("   git commit -m 'PR 97: regenerate NotoSansKR font data (subset)'");
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
