// ─── SettingsRail — identity + section nav for Settings ──────────────────
// A compact identity card (who you're editing) plus a section navigator that
// jumps between the settings tabs — giving the rail a clear purpose on wide
// screens rather than just restating the profile. Does NOT remove the top tabs.

import { C } from "../components/tokens";
import { Avatar } from "../components/Avatars";
import { RailCard, RailRow } from "../components/RailKit";

export default function SettingsRail({ t, profile, name, email, avatarUrl, avatarId, isTeacher, tabs = [], tab, setTab }) {
  return (
    <div>
      <RailCard title={t.railHeading}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}>
          <Avatar photoUrl={avatarUrl} id={avatarId} seed={profile?.id} size={56} />
          <div style={{ minWidth: 0, maxWidth: "100%" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name || "—"}
            </div>
            {email && (
              <div style={{ fontSize: 11.5, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {email}
              </div>
            )}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
            background: C.accentSoft, color: C.accent,
          }}>
            {isTeacher ? t.railRoleTeacher : t.railRoleStudent}
          </span>
        </div>
      </RailCard>

      {tabs.length > 0 && (
        <RailCard title={t.railSections}>
          {tabs.map(([id, label, icon]) => (
            <RailRow
              key={id}
              icon={icon}
              label={label}
              active={tab === id}
              onClick={() => setTab(id)}
            />
          ))}
        </RailCard>
      )}
    </div>
  );
}
