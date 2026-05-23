// ─── Density ─────────────────────────────────────────────────────────────
// One design system, two rhythms. "comfortable" (Notion-like) is the default
// for create/read surfaces; "compact" (TradingView/Sheets-like) is for data
// surfaces (analytics, live panels, long lists). Wrapping a subtree in
// <DensityProvider value="compact"> tightens spacing for everything inside that
// reads the density (e.g. Card uses it for its default padding).
//
//   <DensityProvider value="compact">
//     <Card>…</Card>            // padding auto-tightens (16 → 12)
//   </DensityProvider>
//
//   const { density, space } = useDensity();   // space = SPACE[density]
//   style={{ gap: space.md, padding: space.lg }}

import { createContext, useContext } from "react";
import { SPACE } from "../tokens";

const DensityContext = createContext("comfortable");

export function DensityProvider({ value = "comfortable", children }) {
  const density = value === "compact" ? "compact" : "comfortable";
  return <DensityContext.Provider value={density}>{children}</DensityContext.Provider>;
}

export function useDensity() {
  const density = useContext(DensityContext);
  return { density, space: SPACE[density] || SPACE.comfortable };
}
