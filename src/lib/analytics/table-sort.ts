// ─── src/lib/analytics/table-sort.ts ───────────────────────────────────
// Helpers puros para tablas ordenables. Sin React, sin Supabase.
// sortRows: orden estable por accessor + dirección; null/undefined al final.
// nextSortDir: ciclo de dirección al click del header (asc → desc → none).

export type SortDir = "asc" | "desc" | null;

/**
 * Sorta una copia de `rows` por el valor que devuelve `accessor`.
 * - dir null → devuelve una copia sin ordenar (orden original).
 * - null/undefined del accessor van SIEMPRE al final (en asc y desc).
 * - strings se comparan case-insensitive con localeCompare.
 * - orden estable (preserva el orden relativo de empates).
 */
export function sortRows<T>(
  rows: readonly T[],
  accessor: (row: T) => unknown,
  dir: SortDir,
): T[] {
  const copy = [...rows];
  if (!dir) return copy;
  const factor = dir === "asc" ? 1 : -1;
  return copy
    .map((row, i) => ({ row, i, v: accessor(row) }))
    .sort((a, b) => {
      const an = a.v == null;
      const bn = b.v == null;
      if (an && bn) return a.i - b.i;
      if (an) return 1;
      if (bn) return -1;
      let cmp: number;
      if (typeof a.v === "string" || typeof b.v === "string") {
        cmp = String(a.v).localeCompare(String(b.v), undefined, { sensitivity: "base" });
      } else {
        cmp = (a.v as number) - (b.v as number);
      }
      if (cmp === 0) return a.i - b.i;
      return cmp * factor;
    })
    .map((d) => d.row);
}

/**
 * Próxima dirección al clickear un header.
 * Si clickeás la columna ACTIVA: asc → desc → null (des-ordena).
 * Si clickeás una columna NUEVA: su currentDir es null → asc.
 * Llamá con la dirección actual de ESA columna (null si no es la activa).
 */
export function nextSortDir(_prevForOtherKeys: SortDir, currentDirForKey: SortDir): SortDir {
  if (currentDirForKey === "asc") return "desc";
  if (currentDirForKey === "desc") return null;
  return "asc";
}
