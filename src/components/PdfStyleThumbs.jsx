// ─── PDF style thumbnails ──────────────────────────────────────────────────
// Tiny inline-SVG representations of each printable-test style (~140×190, A4
// ratio). Pure presentational SVG — NO heavy deps (no jsPDF) — so they're
// safe to import from anywhere, including the marketing landing.
//
// Extracted from PDFExportModal.jsx (landing PR B) so both the export modal
// AND the public landing's "print a beautiful test" demo render the exact
// same thumbnails from one source. Each tries to convey the "feel" of the
// style in miniature: classic's double-rule, modern's color band + sticker,
// editorial's drop cap + thick rule, framed's ornamental border.

export function ClassicThumb() {
  return (
    <svg viewBox="0 0 140 190" width="100%" style={{ display: "block" }}>
      <rect x="0" y="0" width="140" height="190" fill="#fff" stroke="#e5e5e5" strokeWidth="0.5" />
      {/* eyebrow */}
      <rect x="14" y="14" width="40" height="3" fill="#999" />
      {/* title */}
      <rect x="14" y="22" width="80" height="6" fill="#1a1a1a" />
      <rect x="14" y="31" width="50" height="3" fill="#999" />
      {/* double rule */}
      <rect x="14" y="40" width="112" height="2.2" fill="#1a1a1a" />
      <rect x="14" y="44" width="112" height="0.5" fill="#bbb" />
      {/* fields */}
      <rect x="14" y="52" width="20" height="2.5" fill="#444" />
      <rect x="45" y="52" width="18" height="2.5" fill="#444" />
      <rect x="73" y="52" width="14" height="2.5" fill="#444" />
      <line x1="14" y1="58" x2="126" y2="58" stroke="#888" strokeWidth="0.3" strokeDasharray="0.8,1.4" />
      {/* section header line + label */}
      <line x1="14" y1="74" x2="50" y2="74" stroke="#888" strokeWidth="0.4" />
      <rect x="55" y="73" width="30" height="2.5" fill="#666" />
      <line x1="90" y1="74" x2="126" y2="74" stroke="#888" strokeWidth="0.4" />
      <rect x="40" y="80" width="60" height="4" fill="#1a1a1a" />
      {/* question 1 — circle + text + 4 bullets */}
      <circle cx="20" cy="98" r="3" fill="none" stroke="#999" strokeWidth="0.5" />
      <rect x="27" y="96" width="70" height="3" fill="#1a1a1a" />
      <rect x="27" y="101" width="40" height="2" fill="#666" />
      <circle cx="32" cy="110" r="1.6" fill="none" stroke="#888" strokeWidth="0.4" />
      <rect x="36" y="109" width="35" height="2" fill="#444" />
      <circle cx="32" cy="118" r="1.6" fill="none" stroke="#888" strokeWidth="0.4" />
      <rect x="36" y="117" width="40" height="2" fill="#444" />
      <circle cx="32" cy="126" r="1.6" fill="none" stroke="#888" strokeWidth="0.4" />
      <rect x="36" y="125" width="32" height="2" fill="#444" />
      {/* question 2 */}
      <circle cx="20" cy="142" r="3" fill="none" stroke="#999" strokeWidth="0.5" />
      <rect x="27" y="140" width="65" height="3" fill="#1a1a1a" />
      <rect x="27" y="145" width="45" height="2" fill="#666" />
      <circle cx="32" cy="154" r="2.4" fill="none" stroke="#888" strokeWidth="0.4" />
      <rect x="38" y="153" width="18" height="2" fill="#444" />
      <circle cx="65" cy="154" r="2.4" fill="none" stroke="#888" strokeWidth="0.4" />
      <rect x="71" y="153" width="18" height="2" fill="#444" />
      {/* footer */}
      <line x1="14" y1="178" x2="126" y2="178" stroke="#e5e5e5" strokeWidth="0.3" />
      <rect x="14" y="182" width="20" height="1.5" fill="#bbb" />
      <rect x="100" y="182" width="26" height="1.5" fill="#bbb" />
    </svg>
  );
}

export function ModernThumb() {
  return (
    <svg viewBox="0 0 140 190" width="100%" style={{ display: "block" }}>
      <rect x="0" y="0" width="140" height="190" fill="#fff" stroke="#e5e5e5" strokeWidth="0.5" />
      {/* eyebrow teal */}
      <rect x="14" y="14" width="40" height="3" fill="#0F7B6C" />
      {/* title */}
      <rect x="14" y="22" width="60" height="6" fill="#1a1a1a" />
      <rect x="14" y="31" width="40" height="3" fill="#666" />
      {/* sticker badge top right */}
      <circle cx="115" cy="26" r="11" fill="#0F7B6C" />
      <circle cx="115" cy="26" r="9.4" fill="none" stroke="#fff" strokeWidth="0.6" />
      <text x="115" y="24.5" fill="#fff" fontSize="3" fontWeight="700" textAnchor="middle">DECK</text>
      <text x="115" y="30" fill="#fff" fontSize="6" fontWeight="700" textAnchor="middle">13</text>
      {/* teal accent rule */}
      <rect x="14" y="42" width="30" height="1.3" fill="#0F7B6C" />
      {/* fields */}
      <rect x="14" y="50" width="20" height="2.5" fill="#444" />
      <rect x="45" y="50" width="18" height="2.5" fill="#444" />
      <rect x="73" y="50" width="14" height="2.5" fill="#444" />
      <line x1="14" y1="56" x2="126" y2="56" stroke="#0F7B6C" strokeWidth="0.3" strokeDasharray="0.8,1.4" />
      {/* section band - teal filled */}
      <rect x="14" y="64" width="112" height="14" rx="2" fill="#0F7B6C" />
      <rect x="18" y="68" width="15" height="2" fill="#fff" />
      <rect x="36" y="68" width="30" height="3.5" fill="#fff" />
      <rect x="36" y="73" width="40" height="1.8" fill="#fff" opacity="0.85" />
      {/* question 1 - teal badge + 4 pills */}
      <circle cx="20" cy="88" r="3.4" fill="#0F7B6C" />
      <text x="20" y="89.5" fill="#fff" fontSize="3.5" fontWeight="700" textAnchor="middle">1</text>
      <rect x="27" y="86" width="68" height="3" fill="#1a1a1a" />
      <rect x="27" y="91" width="35" height="2" fill="#666" />
      {/* MCQ pills */}
      <rect x="27" y="97" width="98" height="5.5" rx="1.5" fill="#E5F3F0" />
      <circle cx="31" cy="99.7" r="1.9" fill="#0F7B6C" />
      <text x="31" y="100.5" fill="#fff" fontSize="2.4" fontWeight="700" textAnchor="middle">a</text>
      <rect x="36" y="98.8" width="40" height="1.8" fill="#444" />
      <rect x="27" y="105" width="98" height="5.5" rx="1.5" fill="#E5F3F0" />
      <circle cx="31" cy="107.7" r="1.9" fill="#0F7B6C" />
      <text x="31" y="108.5" fill="#fff" fontSize="2.4" fontWeight="700" textAnchor="middle">b</text>
      <rect x="36" y="106.8" width="45" height="1.8" fill="#444" />
      <rect x="27" y="113" width="98" height="5.5" rx="1.5" fill="#E5F3F0" />
      <circle cx="31" cy="115.7" r="1.9" fill="#0F7B6C" />
      <text x="31" y="116.5" fill="#fff" fontSize="2.4" fontWeight="700" textAnchor="middle">c</text>
      <rect x="36" y="114.8" width="38" height="1.8" fill="#444" />
      {/* coral section band */}
      <rect x="14" y="128" width="112" height="14" rx="2" fill="#D85A30" />
      <rect x="18" y="132" width="15" height="2" fill="#fff" />
      <rect x="36" y="132" width="40" height="3.5" fill="#fff" />
      <rect x="36" y="137" width="45" height="1.8" fill="#fff" opacity="0.85" />
      {/* free-text question - coral badge + dotted lines */}
      <circle cx="20" cy="152" r="3.4" fill="#D85A30" />
      <text x="20" y="153.5" fill="#fff" fontSize="3.5" fontWeight="700" textAnchor="middle">2</text>
      <rect x="27" y="150" width="80" height="3" fill="#1a1a1a" />
      <rect x="27" y="155" width="50" height="2" fill="#666" />
      {[0, 1, 2].map(i => (
        <line key={i} x1="27" y1={162 + i * 5} x2="125" y2={162 + i * 5}
          stroke="#bbb" strokeWidth="0.3" strokeDasharray="0.7,1.2" />
      ))}
      {/* footer */}
      <rect x="14" y="182" width="22" height="0.7" fill="#0F7B6C" />
    </svg>
  );
}

export function EditorialThumb() {
  return (
    <svg viewBox="0 0 140 190" width="100%" style={{ display: "block" }}>
      <rect x="0" y="0" width="140" height="190" fill="#fff" stroke="#e5e5e5" strokeWidth="0.5" />
      {/* eyebrow long */}
      <rect x="18" y="14" width="80" height="2.5" fill="#999" />
      {/* drop cap big "S" + title to the right */}
      <text x="18" y="36" fill="#0a0a0a" fontSize="20" fontWeight="700" fontFamily="serif">S</text>
      <rect x="34" y="22" width="70" height="4" fill="#1a1a1a" />
      <rect x="34" y="28" width="55" height="3" fill="#1a1a1a" />
      <rect x="34" y="33" width="40" height="2.5" fill="#666" />
      {/* thick black rule */}
      <rect x="18" y="44" width="104" height="1.6" fill="#0a0a0a" />
      {/* fields */}
      <rect x="18" y="52" width="20" height="2.5" fill="#444" />
      <rect x="50" y="52" width="18" height="2.5" fill="#444" />
      <rect x="78" y="52" width="14" height="2.5" fill="#444" />
      <line x1="18" y1="58" x2="122" y2="58" stroke="#666" strokeWidth="0.4" />
      {/* section header — square bullet + small caps */}
      <rect x="18" y="68" width="2" height="2" fill="#0a0a0a" />
      <rect x="22" y="68" width="28" height="2.5" fill="#0a0a0a" />
      <rect x="18" y="75" width="40" height="4" fill="#0a0a0a" />
      <rect x="18" y="82" width="50" height="2" fill="#666" />
      {/* question 1 - monospace number + em-dash bullets */}
      <text x="18" y="98" fill="#666" fontSize="4" fontFamily="monospace" fontWeight="700">01</text>
      <rect x="32" y="96" width="80" height="2.8" fill="#1a1a1a" />
      <rect x="32" y="101" width="50" height="2" fill="#666" />
      {/* MCQ - em dash + letter */}
      <text x="32" y="111" fill="#999" fontSize="3" fontWeight="700">—</text>
      <rect x="36" y="110" width="2" height="2" fill="#0a0a0a" />
      <rect x="40" y="110" width="30" height="2" fill="#444" />
      <text x="32" y="118" fill="#999" fontSize="3" fontWeight="700">—</text>
      <rect x="36" y="117" width="2" height="2" fill="#0a0a0a" />
      <rect x="40" y="117" width="35" height="2" fill="#444" />
      <text x="32" y="125" fill="#999" fontSize="3" fontWeight="700">—</text>
      <rect x="36" y="124" width="2" height="2" fill="#0a0a0a" />
      <rect x="40" y="124" width="28" height="2" fill="#444" />
      {/* question 2 - TF with squares */}
      <text x="18" y="140" fill="#666" fontSize="4" fontFamily="monospace" fontWeight="700">02</text>
      <rect x="32" y="138" width="75" height="2.8" fill="#1a1a1a" />
      <rect x="32" y="143" width="40" height="2" fill="#666" />
      <rect x="32" y="149" width="3" height="3" fill="none" stroke="#0a0a0a" strokeWidth="0.5" />
      <rect x="36" y="150" width="14" height="2" fill="#444" />
      <rect x="56" y="149" width="3" height="3" fill="none" stroke="#0a0a0a" strokeWidth="0.5" />
      <rect x="60" y="150" width="14" height="2" fill="#444" />
      {/* question 3 written response — solid hairlines */}
      <text x="18" y="166" fill="#666" fontSize="4" fontFamily="monospace" fontWeight="700">03</text>
      <rect x="32" y="164" width="70" height="2.8" fill="#1a1a1a" />
      {[0, 1, 2].map(i => (
        <line key={i} x1="32" y1={172 + i * 4} x2="122" y2={172 + i * 4}
          stroke="#ccc" strokeWidth="0.3" />
      ))}
      {/* footer */}
      <line x1="18" y1="183" x2="122" y2="183" stroke="#e5e5e5" strokeWidth="0.3" />
      <text x="18" y="187" fill="#999" fontSize="2.5" fontFamily="monospace">01 / 03</text>
    </svg>
  );
}

export function FramedThumb() {
  return (
    <svg viewBox="0 0 140 190" width="100%" style={{ display: "block" }}>
      <rect x="0" y="0" width="140" height="190" fill="#fff" stroke="#e5e5e5" strokeWidth="0.5" />
      {/* outer frame */}
      <rect x="4" y="4" width="132" height="182" fill="none" stroke="#3a3a3a" strokeWidth="0.4" />
      {/* inner frame */}
      <rect x="7" y="7" width="126" height="176" fill="none" stroke="#3a3a3a" strokeWidth="0.7" />
      {/* corner ornaments — diagonals */}
      <line x1="4" y1="4" x2="7" y2="7" stroke="#3a3a3a" strokeWidth="0.4" />
      <line x1="136" y1="4" x2="133" y2="7" stroke="#3a3a3a" strokeWidth="0.4" />
      <line x1="4" y1="186" x2="7" y2="183" stroke="#3a3a3a" strokeWidth="0.4" />
      <line x1="136" y1="186" x2="133" y2="183" stroke="#3a3a3a" strokeWidth="0.4" />
      {/* centered eyebrow */}
      <rect x="50" y="14" width="40" height="2.5" fill="#999" />
      {/* centered title — serif look */}
      <rect x="38" y="22" width="64" height="5" fill="#1a1a1a" />
      {/* centered meta italic */}
      <rect x="48" y="32" width="44" height="2.5" fill="#999" />
      {/* header rule with diamond accent */}
      <line x1="20" y1="42" x2="65" y2="42" stroke="#3a3a3a" strokeWidth="0.5" />
      <polygon points="70,42 67,40 70,38 73,40 73,40 70,42 73,40 70,38" fill="#3a3a3a" />
      <line x1="75" y1="42" x2="120" y2="42" stroke="#3a3a3a" strokeWidth="0.5" />
      {/* fields */}
      <rect x="20" y="50" width="20" height="2.5" fill="#444" />
      <rect x="52" y="50" width="18" height="2.5" fill="#444" />
      <rect x="80" y="50" width="14" height="2.5" fill="#444" />
      <line x1="20" y1="56" x2="120" y2="56" stroke="#888" strokeWidth="0.3" />
      {/* section header centered */}
      <line x1="20" y1="66" x2="60" y2="66" stroke="#3a3a3a" strokeWidth="0.4" />
      <text x="70" y="68" fill="#1a1a1a" fontSize="5" fontWeight="700" textAnchor="middle" fontFamily="serif">I</text>
      <line x1="80" y1="66" x2="120" y2="66" stroke="#3a3a3a" strokeWidth="0.4" />
      <rect x="55" y="72" width="30" height="3" fill="#1a1a1a" />
      <rect x="40" y="78" width="60" height="2" fill="#999" />
      {/* Q1 — square number badge */}
      <rect x="20" y="92" width="5" height="5" fill="none" stroke="#3a3a3a" strokeWidth="0.4" />
      <text x="22.5" y="96.2" fill="#1a1a1a" fontSize="3.5" fontWeight="700" textAnchor="middle">1</text>
      <rect x="28" y="93.5" width="70" height="2.5" fill="#1a1a1a" />
      <rect x="28" y="98" width="40" height="2" fill="#666" />
      {/* MCQ with brackets */}
      <text x="32" y="108" fill="#3a3a3a" fontSize="3" fontWeight="700">[A]</text>
      <rect x="40" y="106.5" width="35" height="2" fill="#444" />
      <text x="32" y="115" fill="#3a3a3a" fontSize="3" fontWeight="700">[B]</text>
      <rect x="40" y="113.5" width="32" height="2" fill="#444" />
      <text x="32" y="122" fill="#3a3a3a" fontSize="3" fontWeight="700">[C]</text>
      <rect x="40" y="120.5" width="40" height="2" fill="#444" />
      <text x="32" y="129" fill="#3a3a3a" fontSize="3" fontWeight="700">[D]</text>
      <rect x="40" y="127.5" width="30" height="2" fill="#444" />
      {/* Q2 — TF with squares */}
      <rect x="20" y="138" width="5" height="5" fill="none" stroke="#3a3a3a" strokeWidth="0.4" />
      <text x="22.5" y="142.2" fill="#1a1a1a" fontSize="3.5" fontWeight="700" textAnchor="middle">2</text>
      <rect x="28" y="139.5" width="65" height="2.5" fill="#1a1a1a" />
      <rect x="28" y="144" width="42" height="2" fill="#666" />
      <rect x="32" y="150" width="3.5" height="3.5" fill="none" stroke="#3a3a3a" strokeWidth="0.4" />
      <rect x="37" y="151" width="14" height="2" fill="#444" />
      <rect x="56" y="150" width="3.5" height="3.5" fill="none" stroke="#3a3a3a" strokeWidth="0.4" />
      <rect x="61" y="151" width="14" height="2" fill="#444" />
      {/* Q3 — writing lines */}
      <rect x="20" y="164" width="5" height="5" fill="none" stroke="#3a3a3a" strokeWidth="0.4" />
      <text x="22.5" y="168.2" fill="#1a1a1a" fontSize="3.5" fontWeight="700" textAnchor="middle">3</text>
      <rect x="28" y="165.5" width="60" height="2.5" fill="#1a1a1a" />
      {[0, 1].map(i => (
        <line key={i} x1="28" y1={173 + i * 4} x2="120" y2={173 + i * 4}
          stroke="#ccc" strokeWidth="0.3" />
      ))}
    </svg>
  );
}

export const STYLE_THUMBS = {
  classic: ClassicThumb,
  modern: ModernThumb,
  editorial: EditorialThumb,
  framed: FramedThumb,
};
