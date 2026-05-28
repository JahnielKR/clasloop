// src/components/charts/index.ts
//
// Library pública de gráficos para Analytics Studio. Todos los charts
// nuevos del Studio se exportan acá; los consumidores importan desde
// 'src/components/charts' (no desde el path completo del archivo).
//
// F0: re-exporta los 2 existentes (RetentionDonut, RetentionBars).
// F1+ agrega: TrendBarChart (bar + forecast band + compare overlay),
// Donut (primitivo genérico), HorizontalBarList, SparklineCell,
// MasteryHeatmap, DistributionBars.

export { default as RetentionDonut } from "./RetentionDonut";
export { default as RetentionBars } from "./RetentionBars";
export { default as TrendBarChart } from "./TrendBarChart";
export { default as Donut } from "./Donut";
export { default as HorizontalBarList } from "./HorizontalBarList";
export { default as SparklineCell } from "./SparklineCell";
