// ─── CommunityRail — subjects quick-filter for Community ─────────────────
// Subject rows (with deck counts) that drive the existing subject filter, plus
// an "all" row. From the community decks already loaded. See RailKit.

import { RailCard, RailRow, RailCount } from "../components/RailKit";

export default function CommunityRail({ t, subjectCounts, total, subject, setSubject }) {
  return (
    <RailCard title={t.railSubjects}>
      <RailRow
        label={t.allSubjects}
        active={!subject}
        right={<RailCount active={!subject}>{total}</RailCount>}
        onClick={() => setSubject("")}
      />
      {subjectCounts.map((s) => (
        <RailRow
          key={s.subject}
          label={s.subject}
          active={subject === s.subject}
          right={<RailCount active={subject === s.subject}>{s.count}</RailCount>}
          onClick={() => setSubject(s.subject)}
        />
      ))}
    </RailCard>
  );
}
