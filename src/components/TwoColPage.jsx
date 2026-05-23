// ─── TwoColPage — reusable "content + right rail" layout ──────────────────
//
// Generalizes the two-column pattern the Today screen pioneered (SessionFlow's
// pickDeck step): a main column plus a sticky right rail that fills the
// otherwise-empty horizontal space on wide screens. Below `collapseAt` the rail
// is hidden and the main column keeps its own width — so narrow laptops / phones
// see EXACTLY the single-column layout they had before. The side gutters only
// exist on wide screens, so that's the only place we add a rail.
//
// The main column is passed as `children` (or the `main` prop) and keeps its
// own `maxWidth`/centering untouched — this component does NOT restyle it, it
// only reserves a column to its right. When `rail` is null/undefined the layout
// degrades to just the centered main column, so callers can write
// `rail={cond && <Rail/>}` without branching the whole tree.
//
// Each instance scopes its grid CSS to a unique class (via useId) so multiple
// TwoColPage usages with different widths/breakpoints never collide.

import { useId } from "react";

export default function TwoColPage({
  children,
  main,
  rail,
  maxWidth = 1120,
  railWidth = 320,
  collapseAt = 1080,
  gap = 28,
  stickyTop = 24,
  // When set, the main column is capped at this width and the [main+rail] pair
  // is centered — for pages that already self-cap their content (e.g. a card
  // grid). The rail then fills the leftover gutter without shrinking the main
  // content. When null, the main column flexes (1fr) to fill the space.
  mainMax = null,
}) {
  const mainContent = main ?? children;
  // useId() yields a string with colons (":r3:") that isn't a valid CSS class —
  // strip everything but alphanumerics so it can scope the <style> below.
  const cls = `cl-tcp-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  // No rail → render the main content centered. If the page caps its own width
  // (mainMax), honor that so the loading/empty states match the laid-out view;
  // otherwise the content carries its own centering, so render it as-is.
  if (!rail) {
    return mainMax
      ? <div style={{ maxWidth: mainMax, margin: "0 auto" }}>{mainContent}</div>
      : <>{mainContent}</>;
  }

  const mainTrack = mainMax ? `minmax(0, ${mainMax}px)` : "minmax(0, 1fr)";

  return (
    <div className={cls}>
      <style>{`
        .${cls} {
          max-width: ${maxWidth}px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: ${mainTrack} ${railWidth}px;
          ${mainMax ? "justify-content: center;" : ""}
          gap: ${gap}px;
          align-items: start;
        }
        .${cls} > .cl-tcp-rail {
          position: sticky;
          top: ${stickyTop}px;
          align-self: start;
          max-height: calc(100vh - ${stickyTop * 2}px);
          overflow-y: auto;
        }
        @media (max-width: ${collapseAt}px) {
          .${cls} {
            grid-template-columns: 1fr;${mainMax ? `\n            max-width: ${mainMax}px;` : ""}
          }
          .${cls} > .cl-tcp-rail { display: none; }
        }
      `}</style>
      <div className="cl-tcp-main" style={{ minWidth: 0 }}>{mainContent}</div>
      <div className="cl-tcp-rail">{rail}</div>
    </div>
  );
}
