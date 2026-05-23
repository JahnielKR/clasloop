// ─── pdf-styles/scanner ─────────────────────────────────────────────────
//
// PR 59 (FIX REAL del scanner alucinando respuestas): rediseño completo
// del scan sheet. El problema de fondo no era el download ni las cols
// descentradas — era que ML Kit rectifica el papel pero el contenido
// dentro puede estar corrido por margen de impresora, papel curvado,
// inclinación residual, etc. Sin un sistema de fiduciales que el CV
// pueda detectar, las coordenadas de las burbujas terminan equivocadas.
//
// Solución: las 6 fiduciales viejas (4 esquinas del papel + 2 medio
// lateral) se convierten en 8 fiduciales que delimitan un ÁREA
// ESCANEABLE compacta de 157×225mm centrada en la página. TODO el
// contenido (header, score, name/date/class, grid, example, footer)
// vive DENTRO de ese rectángulo. El CV detecta los 8 cuadrados negros
// y hace un segundo warp usando esos puntos → las coords son
// independientes del margen de impresora.
//
// La hoja contiene:
//
//   - 8 marcas fiduciales (4 esquinas + 2 medio horizontal arriba/abajo
//     + 2 medio lateral derecha/izquierda) delimitando el área
//     escaneable. Cuadrados negros 5×5mm con quiet zone 3mm alrededor.
//   - Header con logomark Clasloop + wordmark + badge SCORE / __
//   - Doble línea horizontal (signature visual) arriba y abajo
//   - Campos Name / Date / Class en small-caps con líneas finas
//   - Título del deck (centrado)
//   - Grid de burbujas según template (T10, T20, T30 o T50)
//   - Example caja expandida con 4 ejemplos (tachada, línea, punto
//     chico, rellena) + texto explicativo
//   - Footer con QR + logomark + clasloop.com
//
// Templates internos (se elige según scannable.length):
//
//   T10 → 1-10 preguntas:   1 columna grande, burbujas r=5mm
//   T20 → 11-20 preguntas:  2 columnas, burbujas r=4.5mm
//   T30 → 21-30 preguntas:  3 columnas, burbujas r=4mm
//   T50 → 31-50 preguntas:  3 cols arriba (1-30) + 2 cols abajo (31-50)
//                           alineadas verticalmente con las cols 1-2,
//                           example en el hueco debajo de col 21-30
//
// Dentro de cada template dibujamos SOLO las preguntas reales. Si el
// deck tiene 7 preguntas, T10 dibuja 7 filas (no rellena las 3 vacías).
//
// IMPORTANTE: la hoja es siempre blanco+negro austero. NO usa paletas
// porque las cámaras detectan mejor en alto contraste. NO usa el font
// del style elegido en el modal — Helvetica forzada (o NotoSansKR si
// el deck es coreano).
//
// La answer key NO vive en este PDF. Vive en la app, indexada por
// deck_id que va dentro del QR. El scanner CV (PR 60) leerá el QR
// para cargar las respuestas correctas y comparar.
//
// Respuestas múltiples: el scoring soporta múltiples respuestas
// correctas por pregunta (campo `correct` puede ser ["A"] o ["A","B"]).
// El alumno puede marcar una sola o varias — gana el punto si todas
// las marcadas están en `correct` y marcó al menos una. Esa lógica
// vive en el scoring (PR 61), no acá.

import QRCode from "qrcode";
import { PAGE_A4, groupQuestionsBySection } from "./shared";

// ─── Page geometry ──────────────────────────────────────────────────────
const PAGE = {
  ...PAGE_A4,
  // PR 59: los márgenes "viejos" (22mm) ya no aplican porque ahora
  // TODO el contenido vive dentro del área delimitada por fiduciales,
  // que es 157×225mm centrada en A4. Los márgenes externos del papel
  // los seguimos manteniendo como referencia pero ya no se usan para
  // posicionar contenido — todo se posiciona relativo a SCAN_AREA.
  marginX: 22,
  marginY: 22,
};

export const PAGE_DIMS = { width: PAGE.width, height: PAGE.height };

// ─── Área escaneable (delimitada por las 8 fiduciales) ─────────────────
//
// PR 59: el área escaneable es un rectángulo de 157×225mm centrado en
// la página A4 (210×297). Todas las coordenadas del contenido (header,
// grid, footer) son relativas a esta área. El CV (PR 60) detecta las
// 8 fiduciales y hace warp para mapear EXACTAMENTE este rectángulo
// a un canvas predecible.
//
// Coordenadas en mm desde el TOP-LEFT del papel A4:
//
//   SCAN_AREA.x      = (210 - 157) / 2 = 26.5
//   SCAN_AREA.y      = (297 - 225) / 2 = 36
//   SCAN_AREA.right  = 26.5 + 157 = 183.5
//   SCAN_AREA.bottom = 36 + 225 = 261
//
// Exportado para que el CV pipeline pueda mapear coordenadas.
export const SCAN_AREA = {
  x: 26.5,        // izquierda del área
  y: 36,          // arriba del área
  width: 157,
  height: 225,
  right: 183.5,   // x + width
  bottom: 261,    // y + height
};

// ─── Marcas fiduciales (8 en total) ─────────────────────────────────────
//
// 8 cuadrados negros 5×5mm delimitando el área escaneable:
//   - 4 esquinas (top-left, top-right, bottom-left, bottom-right)
//   - 2 medio horizontal (top-center, bottom-center)
//   - 2 medio lateral (mid-left, mid-right)
//
// Los CENTROS de las fiduciales son lo que el CV detecta. Los exportamos
// para que scanner-mlkit.js (PR 60) sepa exactamente dónde buscarlas
// después del primer warp de ML Kit.
//
// Coordenadas en mm desde el TOP-LEFT del papel:
const FIDUCIAL_SIZE = 5;
const FIDUCIAL_HALF = FIDUCIAL_SIZE / 2;

export const FIDUCIAL_CENTERS = {
  topLeft:      { x: SCAN_AREA.x + FIDUCIAL_HALF,                          y: SCAN_AREA.y + FIDUCIAL_HALF },
  topCenter:    { x: SCAN_AREA.x + SCAN_AREA.width / 2,                    y: SCAN_AREA.y + FIDUCIAL_HALF },
  topRight:     { x: SCAN_AREA.right - FIDUCIAL_HALF,                      y: SCAN_AREA.y + FIDUCIAL_HALF },
  midLeft:      { x: SCAN_AREA.x + FIDUCIAL_HALF,                          y: SCAN_AREA.y + SCAN_AREA.height / 2 },
  midRight:     { x: SCAN_AREA.right - FIDUCIAL_HALF,                      y: SCAN_AREA.y + SCAN_AREA.height / 2 },
  bottomLeft:   { x: SCAN_AREA.x + FIDUCIAL_HALF,                          y: SCAN_AREA.bottom - FIDUCIAL_HALF },
  bottomCenter: { x: SCAN_AREA.x + SCAN_AREA.width / 2,                    y: SCAN_AREA.bottom - FIDUCIAL_HALF },
  bottomRight:  { x: SCAN_AREA.right - FIDUCIAL_HALF,                      y: SCAN_AREA.bottom - FIDUCIAL_HALF },
};

// ─── Constantes de layout del contenido (relativas al área) ────────────
//
// Quiet zone interna: 3mm entre fiduciales y contenido para que el CV
// no confunda burbujas con fiduciales.
const QZ = 3;

// Líneas de contenido — cada constante es la coordenada Y absoluta en mm.
// El área escaneable va de y=36 a y=261. Distribuimos así:
//
//   36-41:    fiduciales superiores
//   46:       logo + CLASLOOP + score box
//   58:       top rule (línea doble)
//   68:       NAME / DATE labels
//   84:       CLASS line
//   100:      deck title (centrado)
//   110-225:  grid de burbujas (rango variable según template)
//   ...:      example caja
//   240:      bottom rule (línea doble)
//   246:      footer (logo + url izq, QR der)
//   256-261:  fiduciales inferiores
const HEADER_LOGO_X = SCAN_AREA.x + QZ + 5;    // 34.5
const HEADER_LOGO_Y = 47;
const HEADER_LOGO_SIZE = 7;
const HEADER_TEXT_X = HEADER_LOGO_X + 6;       // 40.5 (al lado del logo)
const HEADER_TEXT_TITLE_Y = 46;
const HEADER_TEXT_SUB_Y = 50;

const HEADER_SCORE_BOX_W = 35;
const HEADER_SCORE_BOX_H = 14;
const HEADER_SCORE_BOX_X = SCAN_AREA.right - QZ - 5 - HEADER_SCORE_BOX_W;  // 140.5
const HEADER_SCORE_BOX_Y = 42;

const TOP_RULE_Y = 58;
const FIELDS_X_LEFT = SCAN_AREA.x + QZ + 5;     // 34.5
const FIELDS_X_RIGHT = SCAN_AREA.right - QZ - 5; // 175.5
const FIELDS_NAME_Y = 67;
const FIELDS_LINE_Y = 73;
const FIELDS_CLASS_Y = 80;
const FIELDS_CLASS_LINE_Y = 86;

const TITLE_Y = 98;

// Footer
// BOTTOM_RULE_Y_DEFAULT: para T10/T20/T30, deja espacio para el example
//   caja horizontal (y 211-225) + footer (logo y 234, qr y 234).
// BOTTOM_RULE_Y_T50: el grid de T50 termina en y=180+9*6.5=238.5 (centro
//   última fila), las burbujas r=2 llegan a y=240.5. Línea en y=243.
const BOTTOM_RULE_Y_DEFAULT = 230;
const BOTTOM_RULE_Y_T50 = 244;
const FOOTER_LOGO_X = SCAN_AREA.x + QZ + 4;     // 33.5
const FOOTER_QR_SIZE = 16;
const FOOTER_QR_OFFSET = 4; // px debajo del bottom rule

// ─── Templates ──────────────────────────────────────────────────────────
//
// Todos los templates comparten el mismo SCAN_AREA y las mismas
// fiduciales. Lo que cambia es el grid de burbujas (cantidad de
// columnas, tamaño de burbujas, espaciado).
//
// Coordenadas:
//   - colXBase[i]: x del centro de la primera burbuja (A) de la columna i
//   - yStart: y del centro de la primera burbuja (fila 1)
//   - rowHeight: separación vertical entre filas
//   - bubbleR: radio de cada burbuja
//   - bubbleGap: separación horizontal entre centros A→B→C→D
//
// Las burbujas se dibujan en orden A, B, C, D con centros en
// colXBase + i*bubbleGap, i=0..3.

export const TEMPLATES = {
  // T10: 1 columna grande centrada. Burbujas grandes para primaria.
  // Ancho col [num + A B C D] ≈ 50mm. Centrado en SCAN_AREA: el centro
  // de la columna debe estar en SCAN_AREA.x + SCAN_AREA.width/2 = 105.
  // bubbleGap=12 → centro de columna = colXBase + 1.5*12 = colXBase + 18
  // → colXBase = 105 - 18 = 87
  // T10: 1 col centrada. 10 filas × 10mm = 90mm de alto del grid.
  // yStart=115, grid termina en 115+9*10=205. Example en y=210-224. Fits.
  T10: {
    capacity: 10,
    cols: 1,
    bubbleR: 3.5,
    bubbleGap: 12,
    rowHeight: 10,
    fontNum: 10,
    fontLetter: 4,
    fontHeader: 9,
    headerOffset: 6,
    numTextOffset: -10,
    colXBase: [87],
    yStart: 115,
    bottomRuleY: BOTTOM_RULE_Y_DEFAULT,
  },

  // T20: 2 columnas. bubbleGap=10 → centro col = colXBase + 15
  // SCAN_AREA centro = 105. Cols centradas a 65 y 145 → colXBase 50, 130
  // T20: 2 cols. 10 filas × 10mm = 90mm de alto del grid.
  // yStart=115, grid termina en 115+9*10=205. Example en y=210-224. Fits.
  T20: {
    capacity: 20,
    cols: 2,
    bubbleR: 3,
    bubbleGap: 10,
    rowHeight: 10,
    fontNum: 8,
    fontLetter: 3,
    fontHeader: 7,
    headerOffset: 5,
    numTextOffset: -8,
    colXBase: [50, 130],
    yStart: 115,
    bottomRuleY: BOTTOM_RULE_Y_DEFAULT,
  },

  // T30: 3 columnas. bubbleGap=8 → centro col = colXBase + 12
  // Ajuste para que el número "10" no pise la fiducial izq:
  // colXBase[0]=45 → texto "10" ancla en x=45-7=38, arranca en x=33 (libre).
  // Centros de cols: 57, 108, 159. Algo a la derecha (grid centro=108 vs ideal 105)
  // pero asegura que números no toquen fiducial.
  T30: {
    capacity: 30,
    cols: 3,
    bubbleR: 2.5,
    bubbleGap: 8,
    rowHeight: 10,
    fontNum: 7,
    fontLetter: 2.7,
    fontHeader: 6.5,
    headerOffset: 5,
    numTextOffset: -7,
    colXBase: [45, 96, 147],
    yStart: 115,
    bottomRuleY: BOTTOM_RULE_Y_DEFAULT,
  },

  // T50: 3 cols arriba (1-30) + 2 cols abajo (31-50) ALINEADAS con las
  // 2 primeras de arriba. El example va en el hueco debajo de col 21-30
  // (col 2 de arriba — no hay nada abajo en esa posición horizontal).
  //
  // Espacio MUY apretado: 10+10 filas × 6.5mm + 2 column-headers + sep
  // = ~130mm de grid, dejando solo ~10mm de margen vertical.
  //
  // Bloque arriba (3 cols, 1-30):
  //   yStart=110. Headers letras en y=105.5. Grid de y=110 a y=110+9*6.5=168.5
  // Bloque abajo (2 cols, 31-50), alineado con cols 0,1 de arriba:
  //   yStart2=178. Headers letras en y=173.5. Grid de y=178 a y=178+9*6.5=236.5
  //
  // Cols con números de 2 dígitos (31-40, 41-50): colXBase[0]=44.5 para
  // que "40", "41", "50" no pisen la fiducial izq.
  T50: {
    capacity: 50,
    cols: 3,
    cols2: 2,
    bubbleR: 2,
    bubbleGap: 7,
    rowHeight: 6.5,
    fontNum: 6,
    fontLetter: 2.2,
    fontHeader: 5.5,
    headerOffset: 4.5,
    numTextOffset: -5,
    colXBase: [44.5, 94.5, 147.5],
    yStart: 110,
    colXBase2: [44.5, 94.5],
    yStart2: 180,
    bottomRuleY: BOTTOM_RULE_Y_T50,
  },
};

export function pickTemplate(scannableCount) {
  if (scannableCount <= 10) return TEMPLATES.T10;
  if (scannableCount <= 20) return TEMPLATES.T20;
  if (scannableCount <= 30) return TEMPLATES.T30;
  return TEMPLATES.T50;
}

// ─── Helpers de dibujo ──────────────────────────────────────────────────

/**
 * Dibuja las 8 fiduciales que delimitan el área escaneable.
 * El CV (scanner-mlkit.js) detecta estos cuadrados negros y los usa
 * para hacer el segundo warp.
 */
function drawFiducials(doc) {
  doc.setFillColor(0, 0, 0);
  const s = FIDUCIAL_SIZE;
  Object.values(FIDUCIAL_CENTERS).forEach(({ x, y }) => {
    // x, y son CENTROS — para rect necesitamos top-left
    doc.rect(x - FIDUCIAL_HALF, y - FIDUCIAL_HALF, s, s, "F");
  });
}

// Logo monocromo Clasloop — versión simplificada B+N para CV-friendly.
// (El logo real con gradiente está en src/components/Icons.jsx LogoMark
// pero acá usamos B+N porque las cámaras detectan mejor en alto contraste.)
function drawLogomark(doc, cx, cy, size = 7) {
  const half = size / 2;
  const x = cx - half;
  const y = cy - half;
  const radius = size * 0.22;

  // Cuadrado redondeado relleno negro
  doc.setFillColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.roundedRect(x, y, size, size, radius, radius, "F");

  // Reloj: círculo blanco contorneado
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(size * 0.06);
  const clockR = size * 0.28;
  doc.circle(cx, cy, clockR, "S");

  // Manecillas del reloj
  doc.setLineWidth(size * 0.07);
  doc.line(cx, cy, cx, cy - clockR * 0.7);
  doc.line(cx, cy, cx + clockR * 0.45, cy + clockR * 0.2);

  // Sol: circulito blanco arriba
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, y + size * 0.16, size * 0.045, "F");
}

function drawHeader(doc, fontFamily) {
  drawLogomark(doc, HEADER_LOGO_X, HEADER_LOGO_Y, HEADER_LOGO_SIZE);
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("CLASLOOP", HEADER_TEXT_X, HEADER_TEXT_TITLE_Y, { charSpace: 0.6 });
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(136, 136, 136);
  doc.text("ANSWER SHEET", HEADER_TEXT_X, HEADER_TEXT_SUB_Y, { charSpace: 0.3 });

  // Score box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.roundedRect(HEADER_SCORE_BOX_X, HEADER_SCORE_BOX_Y, HEADER_SCORE_BOX_W, HEADER_SCORE_BOX_H, 2, 2, "S");
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(6);
  doc.setTextColor(136, 136, 136);
  doc.text("SCORE", HEADER_SCORE_BOX_X + 3, HEADER_SCORE_BOX_Y + 5, { charSpace: 0.4 });
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("/", HEADER_SCORE_BOX_X + HEADER_SCORE_BOX_W / 2, HEADER_SCORE_BOX_Y + 11, { align: "center" });

  // Top rule (doble línea)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(FIELDS_X_LEFT, TOP_RULE_Y, FIELDS_X_RIGHT, TOP_RULE_Y);
  doc.setLineWidth(0.2);
  doc.line(FIELDS_X_LEFT, TOP_RULE_Y + 1.5, FIELDS_X_RIGHT, TOP_RULE_Y + 1.5);
}

function drawFields(doc, fontFamily) {
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(7);
  doc.setTextColor(136, 136, 136);

  const xMidName = FIELDS_X_LEFT + (FIELDS_X_RIGHT - FIELDS_X_LEFT) * 0.55;
  const xMidDate = xMidName + 4;

  doc.text("NAME", FIELDS_X_LEFT, FIELDS_NAME_Y, { charSpace: 0.5 });
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(FIELDS_X_LEFT, FIELDS_LINE_Y, xMidName, FIELDS_LINE_Y);

  doc.text("DATE", xMidDate, FIELDS_NAME_Y, { charSpace: 0.5 });
  doc.line(xMidDate, FIELDS_LINE_Y, FIELDS_X_RIGHT, FIELDS_LINE_Y);

  doc.text("CLASS", FIELDS_X_LEFT, FIELDS_CLASS_Y, { charSpace: 0.5 });
  doc.line(FIELDS_X_LEFT, FIELDS_CLASS_LINE_Y, FIELDS_X_RIGHT, FIELDS_CLASS_LINE_Y);
}

function drawTitle(doc, deck, fontFamily) {
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const title = (deck.title || "Answer sheet").trim();
  doc.text(title, SCAN_AREA.x + SCAN_AREA.width / 2, TITLE_Y, { align: "center" });
}

function drawBubbleRow(doc, numLabel, choices, baseX, baseY, t, fontFamily) {
  // Número de pregunta a la izquierda
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(t.fontNum);
  doc.setTextColor(0, 0, 0);
  doc.text(numLabel, baseX + t.numTextOffset, baseY + t.fontNum / 4, { align: "right" });

  // Burbujas vacías (los headers A/B/C/D van arriba de la columna)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  choices.forEach((letter, i) => {
    const cx = baseX + i * t.bubbleGap;
    doc.circle(cx, baseY, t.bubbleR, "S");
  });
}

function drawColumnHeader(doc, colBaseX, yStart, t, fontFamily) {
  const choices = ["A", "B", "C", "D"];
  const headerY = yStart - t.headerOffset;
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(t.fontHeader);
  doc.setTextColor(110, 110, 110);
  choices.forEach((letter, i) => {
    const cx = colBaseX + i * t.bubbleGap;
    doc.text(letter, cx, headerY, { align: "center" });
  });
}

function drawBlockSeparator(doc, x1, x2, y) {
  doc.setDrawColor(221, 221, 221);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

function drawColumn(doc, questions, startQNum, colBaseX, yStart, t, fontFamily) {
  questions.forEach((q, idx) => {
    const rowY = yStart + idx * t.rowHeight;
    const qNum = startQNum + idx;
    // TF preguntas: solo A, B (T=A, F=B)
    const choices = q.type === "tf" ? ["A", "B"] : ["A", "B", "C", "D"];
    drawBubbleRow(doc, String(qNum), choices, colBaseX, rowY, t, fontFamily);
  });

  // Separador visual cada 5 preguntas (solo si la columna tiene >=6 filas)
  if (questions.length >= 6) {
    const sepY = yStart + 4 * t.rowHeight + t.rowHeight / 2;
    drawBlockSeparator(
      doc,
      colBaseX - (t.bubbleR + 4),
      colBaseX + 3 * t.bubbleGap + t.bubbleR + 2,
      sepY
    );
  }
}

function drawGrid(doc, scannable, t, fontFamily) {
  if (t === TEMPLATES.T50) {
    // Bloque arriba: 3 cols × 10 filas (preguntas 1-30)
    const upper = scannable.slice(0, 30);
    for (let c = 0; c < t.cols; c++) {
      const colQs = upper.slice(c * 10, (c + 1) * 10);
      if (colQs.length === 0) break;
      drawColumnHeader(doc, t.colXBase[c], t.yStart, t, fontFamily);
      drawColumn(doc, colQs, c * 10 + 1, t.colXBase[c], t.yStart, t, fontFamily);
    }
    // Bloque abajo: 2 cols × 10 filas (preguntas 31-50), alineadas con cols 0,1 de arriba
    const lower = scannable.slice(30, 50);
    for (let c = 0; c < t.cols2; c++) {
      const colQs = lower.slice(c * 10, (c + 1) * 10);
      if (colQs.length === 0) break;
      drawColumnHeader(doc, t.colXBase2[c], t.yStart2, t, fontFamily);
      drawColumn(doc, colQs, 30 + c * 10 + 1, t.colXBase2[c], t.yStart2, t, fontFamily);
    }
  } else {
    for (let c = 0; c < t.cols; c++) {
      const colQs = scannable.slice(c * 10, (c + 1) * 10);
      if (colQs.length === 0) break;
      drawColumnHeader(doc, t.colXBase[c], t.yStart, t, fontFamily);
      drawColumn(doc, colQs, c * 10 + 1, t.colXBase[c], t.yStart, t, fontFamily);
    }
  }
}

/**
 * Dibuja la caja de ejemplo expandida con 4 burbujas de muestra y
 * texto explicativo. Para T10/T20/T30 va horizontal entre el grid y
 * el footer. Para T50 va en el hueco vertical debajo de col 21-30.
 */
function drawExample(doc, t, fontFamily) {
  if (t === TEMPLATES.T50) {
    drawExampleVertical(doc, t, fontFamily);
  } else {
    drawExampleHorizontal(doc, t, fontFamily);
  }
}

/**
 * Caja horizontal con burbujas a la derecha y texto a la izquierda.
 * Para T10/T20/T30.
 *
 * Grid termina en y=205 (T10/T20: yStart 115 + 9*10) o y=196 (T30: 115 + 9*10).
 * Example caja ocupa y=210 a y=224. bottomRule en y=230.
 */
function drawExampleHorizontal(doc, t, fontFamily) {
  const boxY = 211;
  const boxX = FIELDS_X_LEFT;
  const boxW = FIELDS_X_RIGHT - FIELDS_X_LEFT;
  const boxH = 14;

  // Borde fino de la caja
  doc.setDrawColor(204, 204, 204);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "S");

  // Título
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(7);
  doc.setTextColor(85, 85, 85);
  doc.text("HOW TO FILL THE BUBBLES", boxX + 3, boxY + 4, { charSpace: 0.5 });

  // Texto explicativo (2 líneas)
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(6);
  doc.setTextColor(68, 68, 68);
  doc.text("Use a dark pen or pencil. Fill the bubble completely.", boxX + 3, boxY + 8);
  doc.text("Avoid stray marks. If you change an answer, erase fully.", boxX + 3, boxY + 11);

  // Tip en cursiva
  doc.setFont(fontFamily, "italic");
  doc.setFontSize(5.5);
  doc.setTextColor(119, 119, 119);
  doc.text("Tip: leaving a question blank counts as no answer.", boxX + 3, boxY + 13.5);

  // 4 burbujas de ejemplo a la derecha
  const bubblesX = boxX + boxW - 45;
  const bubblesY = boxY + boxH / 2;
  const bR = 1.8;
  const bGap = 7;

  doc.setDrawColor(0, 0, 0);

  // Tachada (mal)
  doc.setLineWidth(0.35);
  doc.circle(bubblesX, bubblesY, bR, "S");
  doc.setLineWidth(0.5);
  doc.line(bubblesX - bR * 0.75, bubblesY - bR * 0.75, bubblesX + bR * 0.75, bubblesY + bR * 0.75);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(5);
  doc.setTextColor(85, 85, 85);
  doc.text("no", bubblesX, bubblesY + bR + 2.5, { align: "center" });

  // Línea horizontal (mal)
  doc.setLineWidth(0.35);
  doc.circle(bubblesX + bGap, bubblesY, bR, "S");
  doc.setLineWidth(0.6);
  doc.line(bubblesX + bGap - bR * 0.8, bubblesY, bubblesX + bGap + bR * 0.8, bubblesY);
  doc.text("no", bubblesX + bGap, bubblesY + bR + 2.5, { align: "center" });

  // Punto chico (mal) — NUEVO en PR 59
  doc.setLineWidth(0.35);
  doc.circle(bubblesX + bGap * 2, bubblesY, bR, "S");
  doc.setFillColor(0, 0, 0);
  doc.circle(bubblesX + bGap * 2, bubblesY, 0.5, "F");
  doc.text("no", bubblesX + bGap * 2, bubblesY + bR + 2.5, { align: "center" });

  // Rellena (bien)
  doc.setFillColor(0, 0, 0);
  doc.circle(bubblesX + bGap * 3, bubblesY, bR, "F");
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(5);
  doc.setTextColor(0, 0, 0);
  doc.text("yes", bubblesX + bGap * 3, bubblesY + bR + 2.5, { align: "center" });

  // Flecha apuntando al yes
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.line(bubblesX + bGap * 3 + bR + 1.5, bubblesY, bubblesX + bGap * 3 + bR + 5, bubblesY);
  doc.setFillColor(0, 0, 0);
  doc.triangle(
    bubblesX + bGap * 3 + bR + 4, bubblesY - 1.2,
    bubblesX + bGap * 3 + bR + 5.5, bubblesY,
    bubblesX + bGap * 3 + bR + 4, bubblesY + 1.2,
    "F"
  );
}

/**
 * Caja vertical para T50, posicionada en el hueco debajo de la
 * columna 21-30 (que es la columna 2 de arriba — no tiene par abajo).
 * Las burbujas van apiladas verticalmente, el texto debajo.
 *
 * Posición: alineada con colXBase[2]=147.5, en la altura del bloque
 * abajo (yStart2=178, alto ~60mm).
 */
function drawExampleVertical(doc, t, fontFamily) {
  // Caja: arranca un poco a la izq de colXBase[2] para abarcar las 4 burbujas
  // de muestra. Ancho 38mm, alto = mismo del bloque abajo (~62mm)
  //
  // Posición Y: arranca DESPUÉS de la pregunta 30 (que está en yStart=110 + 9*6.5 = 168.5).
  // Le damos 4mm de gap = boxY 172.
  const boxX = t.colXBase[2] - 8;        // 139.5
  const boxY = 172;
  const boxW = 38;
  const boxH = 64;                        // alcanza hasta ~236 (donde termina el bloque abajo)

  // Borde fino
  doc.setDrawColor(204, 204, 204);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, "S");

  // Título
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(6);
  doc.setTextColor(85, 85, 85);
  doc.text("HOW TO FILL", boxX + 2, boxY + 4, { charSpace: 0.4 });

  // 4 burbujas verticales con sus labels
  const bR = 1.8;
  const bX = boxX + 4.5;
  let bY = boxY + 10;
  const labelX = bX + 5;

  doc.setDrawColor(0, 0, 0);

  // Tachada (no)
  doc.setLineWidth(0.35);
  doc.circle(bX, bY, bR, "S");
  doc.setLineWidth(0.5);
  doc.line(bX - bR * 0.75, bY - bR * 0.75, bX + bR * 0.75, bY + bR * 0.75);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(5);
  doc.setTextColor(85, 85, 85);
  doc.text("no", labelX, bY + 1, { align: "left" });
  bY += 6;

  // Línea (no)
  doc.setLineWidth(0.35);
  doc.circle(bX, bY, bR, "S");
  doc.setLineWidth(0.6);
  doc.line(bX - bR * 0.8, bY, bX + bR * 0.8, bY);
  doc.text("no", labelX, bY + 1, { align: "left" });
  bY += 6;

  // Punto chico (no)
  doc.setLineWidth(0.35);
  doc.circle(bX, bY, bR, "S");
  doc.setFillColor(0, 0, 0);
  doc.circle(bX, bY, 0.5, "F");
  doc.text("no", labelX, bY + 1, { align: "left" });
  bY += 6;

  // Rellena (yes)
  doc.setFillColor(0, 0, 0);
  doc.circle(bX, bY, bR, "F");
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(5);
  doc.setTextColor(0, 0, 0);
  doc.text("yes", labelX, bY + 1, { align: "left" });

  // Texto explicativo debajo
  bY += 8;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(5);
  doc.setTextColor(68, 68, 68);
  doc.text("Fill the bubble", boxX + 2, bY);
  doc.text("completely with", boxX + 2, bY + 3);
  doc.text("a dark pen.", boxX + 2, bY + 6);
  bY += 10;
  doc.text("Erase fully if you", boxX + 2, bY);
  doc.text("change an answer.", boxX + 2, bY + 3);

  // Tip
  bY += 8;
  doc.setFont(fontFamily, "italic");
  doc.setFontSize(4.5);
  doc.setTextColor(119, 119, 119);
  doc.text("Tip: a blank question", boxX + 2, bY);
  doc.text("counts as no answer.", boxX + 2, bY + 3);
}

async function drawFooter(doc, deck, fontFamily, bottomRuleY) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(FIELDS_X_LEFT, bottomRuleY, FIELDS_X_RIGHT, bottomRuleY);
  doc.setLineWidth(0.2);
  doc.line(FIELDS_X_LEFT, bottomRuleY + 1.5, FIELDS_X_RIGHT, bottomRuleY + 1.5);

  // Logo + clasloop.com a la izquierda
  const logoY = bottomRuleY + 5;
  drawLogomark(doc, FOOTER_LOGO_X, logoY, 5);
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text("clasloop.com", FOOTER_LOGO_X + 5, logoY + 1.5, { charSpace: 0.4 });

  // QR a la derecha — tamaño adaptativo según el espacio disponible
  // hasta la fiducial inferior (y=256).
  // Espacio = (SCAN_AREA.bottom - FIDUCIAL_SIZE - QZ) - (bottomRuleY + FOOTER_QR_OFFSET)
  // Si el espacio es < FOOTER_QR_SIZE, achicamos el QR.
  const qrPayload = `clasloop:deck:${deck.id || ""}`;
  let qrDataURL;
  try {
    qrDataURL = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 200,
    });
  } catch (err) {
    console.error("[clasloop scanner] QR generation failed:", err);
  }

  if (qrDataURL) {
    const qrYMaxBottom = SCAN_AREA.bottom - FIDUCIAL_SIZE - QZ;
    const qrYStart = bottomRuleY + FOOTER_QR_OFFSET;
    const availableSpace = qrYMaxBottom - qrYStart;
    const qrSize = Math.min(FOOTER_QR_SIZE, availableSpace);
    const qrX = FIELDS_X_RIGHT - qrSize;
    doc.addImage(qrDataURL, "PNG", qrX, qrYStart, qrSize, qrSize);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────

export async function drawScanSheet(doc, deck, classObj, opts = {}) {
  const { fontFamily = "helvetica" } = opts;

  const allQuestions = deck.questions || [];

  // El scan sheet sigue el mismo orden que el exam normal (MCQs primero,
  // después TFs) — los styles del exam usan groupQuestionsBySection que
  // reordena dentro de "selection" según SELECTION_TYPE_ORDER.
  const { selection } = groupQuestionsBySection(allQuestions);

  const scannable = selection.filter(
    q => q && (q.type === "mcq" || q.type === "tf")
  );
  const manual = allQuestions.filter(
    q => q && q.type !== "mcq" && q.type !== "tf"
  );

  if (scannable.length > 50) {
    drawFiducials(doc);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Too many scannable questions", SCAN_AREA.x + QZ + 5, SCAN_AREA.y + 20);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(10);
    const errMsg = `This deck has ${scannable.length} MCQ/TF questions. ` +
      `Scan sheet supports up to 50. ` +
      `Print the regular Exam variant (without scan sheet) instead.`;
    doc.text(doc.splitTextToSize(errMsg, SCAN_AREA.width - 2 * (QZ + 5)), SCAN_AREA.x + QZ + 5, SCAN_AREA.y + 35);
    return;
  }

  if (scannable.length === 0) {
    drawFiducials(doc);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("No scannable questions", SCAN_AREA.x + QZ + 5, SCAN_AREA.y + 20);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(10);
    doc.text(
      "This deck has no MCQ or T/F questions. The scan sheet has nothing to grade. Print the regular Exam variant instead.",
      SCAN_AREA.x + QZ + 5, SCAN_AREA.y + 35,
      { maxWidth: SCAN_AREA.width - 2 * (QZ + 5) }
    );
    return;
  }

  const template = pickTemplate(scannable.length);

  drawFiducials(doc);
  drawHeader(doc, fontFamily);
  drawFields(doc, fontFamily);
  drawTitle(doc, deck, fontFamily);
  drawGrid(doc, scannable, template, fontFamily);
  drawExample(doc, template, fontFamily);

  if (manual.length > 0) {
    const noteY = template.bottomRuleY - 5;
    doc.setFont(fontFamily, "italic");
    doc.setFontSize(6);
    doc.setTextColor(136, 136, 136);
    doc.text(
      `Note: ${manual.length} additional question${manual.length > 1 ? "s" : ""} (fill / open / match / order) require manual grading.`,
      FIELDS_X_LEFT, noteY,
      { maxWidth: SCAN_AREA.width - 2 * (QZ + 5) - FOOTER_QR_SIZE - 4 }
    );
  }

  await drawFooter(doc, deck, fontFamily, template.bottomRuleY);
}
