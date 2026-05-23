// ─── LibraryRail — overview sidebar for the Decks "Library" list ─────────
// Library health (decks / never-used / favorites, with icons) + a "Most used"
// list and a by-class breakdown — the list fills the rail so it doesn't read
// as empty when there are only a couple of stats. From the loaded decks. RailKit.

import { C } from "../components/tokens";
import { RailCard, RailStat, RailRow, RailCount, RailItem } from "../components/RailKit";

export default function LibraryRail({
  t,
  totalDecks,
  neverUsed,
  favoritesCount,
  topDecks = [],
  classCounts = [],
  activeClassTab,
  onPickClass,
}) {
  return (
    <div>
      <RailCard title={t.railHeading}>
        <div style={{ display: "flex", gap: 16, justifyContent: "space-between", alignItems: "flex-end" }}>
          <RailStat value={totalDecks} label={t.railDecks} />
          <RailStat value={neverUsed} label={t.railNeverUsed} color={neverUsed > 0 ? C.orange : undefined} />
          <RailStat value={favoritesCount} label={t.railFavorites} icon="star" />
        </div>
      </RailCard>

      <RailCard title={t.railMostUsed}>
        {topDecks.length === 0 ? (
          <RailItem icon="other" label={t.railNoUsage} />
        ) : (
          topDecks.map((d) => (
            <RailItem
              key={d.id}
              icon="book"
              label={d.title}
              right={<RailCount>{d.uses}</RailCount>}
            />
          ))
        )}
      </RailCard>

      {classCounts.length > 1 && (
        <RailCard title={t.railByClass}>
          {classCounts.map((c) => (
            <RailRow
              key={c.id}
              label={c.name}
              active={activeClassTab === c.id}
              right={<RailCount active={activeClassTab === c.id}>{c.count}</RailCount>}
              onClick={() => onPickClass(c.id)}
            />
          ))}
        </RailCard>
      )}
    </div>
  );
}
