// ─── ScannerRail — "this session" sidebar for the Scanner ────────────────
// Running tally of sheets scanned this session (with a friendly empty state) +
// the deck in focus, plus a short how-it-works card. Mostly meaningful on
// native (web shows the download fallback). RailKit.

import { C } from "../components/tokens";
import { RailCard, RailStat, RailItem } from "../components/RailKit";

export default function ScannerRail({ t, scanCount, deckTitle }) {
  return (
    <div>
      <RailCard title={t.railHeading}>
        {scanCount > 0 ? (
          <RailStat value={scanCount} label={t.railScanned} color={C.green} icon="scan" />
        ) : (
          <RailItem icon="scan" label={t.railNoScans} />
        )}
        {deckTitle && (
          <div style={{ marginTop: 12, fontSize: 12, color: C.textMuted }}>
            {t.railDeck}: <span style={{ color: C.text, fontWeight: 600 }}>{deckTitle}</span>
          </div>
        )}
      </RailCard>
      <RailCard title={t.railHelpHeading}>
        <p style={{ margin: 0, fontSize: 12.5, color: C.textSecondary, lineHeight: 1.6 }}>
          {t.railHelp}
        </p>
      </RailCard>
    </div>
  );
}
