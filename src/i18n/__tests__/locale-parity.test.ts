/* @vitest-environment node */
// ─── locale-parity.test.ts ─────────────────────────────────────────────
//
// PR 135 (M30): garantiza que en/es/ko tengan EXACTAMENTE las mismas keys.
//
// TypeScript ya lo fuerza en compile (es.ts y ko.ts se tipan como `Locale`,
// derivado de en.ts). Este test es belt-and-suspenders: corre en runtime y
// además cubre dos cosas que el tipo NO atrapa al no usar `as const`:
//   - longitud de los arrays (community.langs, lobbyThemeSelector.sampleOptions):
//     el tipo es `string[]`, así que un array más corto/largo pasa el compile
//     pero acá se detecta porque collectKeys baja a los índices.
//   - que ningún leaf sea un objeto anidado por error.
//
// Nota: la mayoría de los valores son strings, pero 7 son funciones de
// interpolación (ej. scanner.resultScore) y 2 son arrays. collectKeys baja
// a los arrays (typeof [] === "object") y trata a las funciones como leaf.

import { describe, it, expect } from "vitest";
import en from "../en";
import es from "../es";
import ko from "../ko";

function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const k of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    const value = obj[k];
    if (value && typeof value === "object") {
      keys.push(...collectKeys(value as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe("i18n parity", () => {
  const enKeys = collectKeys(en as Record<string, unknown>);

  it("es matches en", () => {
    expect(collectKeys(es as Record<string, unknown>)).toEqual(enKeys);
  });

  it("ko matches en", () => {
    expect(collectKeys(ko as Record<string, unknown>)).toEqual(enKeys);
  });

  it("every leaf is a string or interpolation function", () => {
    for (const locale of [en, es, ko]) {
      const keys = collectKeys(locale as Record<string, unknown>);
      for (const k of keys) {
        const parts = k.split(".");
        let val: unknown = locale;
        for (const p of parts) val = (val as Record<string, unknown>)[p];
        expect(["string", "function"]).toContain(typeof val);
      }
    }
  });
});
