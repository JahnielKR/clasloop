// src/components/analytics/StudioSkeleton.jsx
//
// F9 Analytics Studio: skeleton de carga para las sub-vistas. Reemplaza
// el "Cargando…" en texto plano por bloques shimmer con la rítmica de la
// vista. Reusa <Skeleton> (src/components/ui/Skeleton.jsx), que ya respeta
// prefers-reduced-motion (shimmer off).
//
// Props:
//   variant: "class" | "student" | "topic" | "reports"  (default "class")

import Skeleton from "../ui/Skeleton";

function KpiRow({ count = 5 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))", gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={84} radius={8} />
      ))}
    </div>
  );
}

export default function StudioSkeleton({ variant = "class" }) {
  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      {variant === "reports" ? (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
          <Skeleton height={320} radius={8} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton height={56} radius={8} />
            <Skeleton height={56} radius={8} />
            <Skeleton height={56} radius={8} />
          </div>
        </div>
      ) : (
        <>
          <KpiRow count={variant === "topic" ? 3 : 5} />
          {variant !== "topic" && <Skeleton height={56} radius={8} />}
          <div style={{ display: "grid", gridTemplateColumns: variant === "student" ? "1fr" : "2fr 1fr", gap: 10 }}>
            <Skeleton height={200} radius={8} />
            {variant !== "student" && <Skeleton height={200} radius={8} />}
          </div>
          <Skeleton height={180} radius={8} />
        </>
      )}
    </div>
  );
}
