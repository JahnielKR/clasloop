export const C = {
  bg: "#FFFFFF",
  bgSoft: "#F7F7F5",
  accent: "#2383E2",
  accentSoft: "#E8F0FE",
  accentDark: "#1B6EC2",
  green: "#0F7B6C",
  greenSoft: "#EEFBF5",
  orange: "#D9730D",
  orangeSoft: "#FFF3E0",
  red: "#E03E3E",
  redSoft: "#FDECEC",
  purple: "#6940A5",
  purpleSoft: "#F3EEFB",
  yellow: "#D4A017",
  yellowSoft: "#FEF9E7",
  pink: "#AD1A72",
  pinkSoft: "#FDEEF6",
  text: "#191919",
  textSecondary: "#6B6B6B",
  textMuted: "#9B9B9B",
  border: "#E8E8E4",
  shadow: "0 1px 3px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.05)",
};

export const FONTS = {
  display: "'Instrument Serif', serif",
  body: "'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

export const OPT_COLORS = ["#2383E2", "#0F7B6C", "#D9730D", "#6940A5"];

export const retCol = (v) => v >= 70 ? C.green : v >= 40 ? C.orange : C.red;
