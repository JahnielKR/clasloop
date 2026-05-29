// src/components/analytics/ExportMenu.jsx
//
// F7 Analytics Studio: botón "Exportar" en la toolbar (StudioShell
// toolbarExtras slot). Dropdown con PDF / CSV / Excel. Recibe una función
// `buildModel` que el padre provee (arma el ReportModel de los datos
// cargados de esa vista). Los exporters hacen dynamic import de jspdf/xlsx.
//
// NOTA: buildModel puede ser sync o async (await lo cubre los dos casos —
// el caller del Reports page re-fetcha y devuelve una Promise).

import { useEffect, useRef, useState } from "react";
import { C, SH } from "../tokens";
import { downloadCsv } from "../../lib/analytics/export-csv";
import { downloadPdf } from "../../lib/analytics/export-pdf";
import { downloadXlsx } from "../../lib/analytics/export-xlsx";

export default function ExportMenu({ buildModel, baseName = "reporte", disabled = false }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);

  // Click-outside + Esc cierran el dropdown.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function run(kind) {
    if (busy) return;
    setOpen(false);
    const model = await buildModel?.();
    if (!model) return;
    setBusy(true);
    try {
      if (kind === "csv") downloadCsv(model, `${baseName}.csv`);
      else if (kind === "pdf") await downloadPdf(model, `${baseName}.pdf`);
      else if (kind === "xlsx") await downloadXlsx(model, `${baseName}.xlsx`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          padding: "4px 11px",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          background: C.bg,
          border: `1px solid ${C.border}`,
          cursor: disabled || busy ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {busy ? "Exportando…" : "Exportar ▾"}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            boxShadow: SH.md,
            zIndex: 30,
            minWidth: 120,
            overflow: "hidden",
          }}
        >
          {[
            ["pdf", "PDF"],
            ["csv", "CSV"],
            ["xlsx", "Excel"],
          ].map(([kind, label]) => (
            <button
              key={kind}
              role="menuitem"
              onClick={() => run(kind)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: 13,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.bgSoft)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
