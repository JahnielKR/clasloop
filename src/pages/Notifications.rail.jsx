// ─── NotificationsRail — overview sidebar for Notifications ──────────────
// Counts by type (clickable to set the existing filter) + a total. All from
// the notifications already loaded on the page. See RailKit / TwoColPage.

import { RailCard, RailStat, RailRow, RailCount } from "../components/RailKit";

export default function NotificationsRail({ t, counts, total, filter, setFilter }) {
  const rows = [
    ["all", t.all],
    ["review", t.review],
    ["session", t.sessions],
    ["system", t.system],
  ];
  return (
    <div>
      <RailCard title={t.railHeading}>
        <RailStat value={total} label={t.railActive} />
      </RailCard>
      <RailCard title={t.railByType}>
        {rows.map(([k, label]) => (
          <RailRow
            key={k}
            label={label}
            active={filter === k}
            right={<RailCount active={filter === k}>{counts[k] || 0}</RailCount>}
            onClick={() => setFilter(k)}
          />
        ))}
      </RailCard>
    </div>
  );
}
