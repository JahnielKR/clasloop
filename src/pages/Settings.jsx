import { useState } from "react";
import { CIcon } from "../components/Icons";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";

const i18n = {
  en: {
    pageTitle: "Settings", profile: "Profile", classes: "My Classes", notifications: "Notifications",
    appearance: "Appearance", account: "Account",
    fullName: "Full name", email: "Email", role: "Role", school: "School", schoolPlaceholder: "Your school name",
    saveChanges: "Save changes", saved: "Saved!", teacher: "Teacher", student: "Student",
    addClass: "+ Add class", students: "students", classCode: "Code", editClass: "Edit", deleteClass: "Delete",
    emailNotifs: "Email notifications", emailNotifsDesc: "Receive weekly retention reports via email",
    pushNotifs: "Push notifications", pushNotifsDesc: "Get reminded when topics need review",
    studentReminders: "Student reminders", studentRemindersDesc: "Send automatic study reminders",
    weeklyReport: "Weekly report", weeklyReportDesc: "Receive a summary every Monday",
    language: "Language", languageDesc: "Choose your preferred language",
    theme: "Theme", themeDesc: "Choose your preferred appearance",
    light: "Light", dark: "Dark (soon)", system: "System",
    dangerZone: "Danger zone", deleteAccount: "Delete account",
    deleteAccountDesc: "Permanently delete your account and all data. Cannot be undone.",
    deleteAccountBtn: "Delete my account", exportData: "Export data",
    exportDataDesc: "Download all your data as JSON", exportBtn: "Export",
    changePassword: "Change password", currentPassword: "Current password",
    newPassword: "New password", confirmPassword: "Confirm password", updatePassword: "Update password",
    avatar: "Avatar", changeAvatar: "Change avatar",
    dailyGoal: "Daily goal", dailyGoalDesc: "How many questions per day", questionsPerDay: "questions/day",
    studyReminders: "Study reminders", studyRemindersDesc: "Get reminded to practice weak topics",
    streakReminder: "Streak reminder", streakReminderDesc: "Don't lose your streak — daily reminder",
  },
  es: {
    pageTitle: "Ajustes", profile: "Perfil", classes: "Mis Clases", notifications: "Notificaciones",
    appearance: "Apariencia", account: "Cuenta",
    fullName: "Nombre completo", email: "Correo electrónico", role: "Rol", school: "Escuela", schoolPlaceholder: "Nombre de tu escuela",
    saveChanges: "Guardar cambios", saved: "Guardado!", teacher: "Profesor", student: "Estudiante",
    addClass: "+ Agregar clase", students: "estudiantes", classCode: "Código", editClass: "Editar", deleteClass: "Eliminar",
    emailNotifs: "Notificaciones por email", emailNotifsDesc: "Recibe reportes semanales de retención",
    pushNotifs: "Notificaciones push", pushNotifsDesc: "Recibe recordatorios de repaso",
    studentReminders: "Recordatorios a estudiantes", studentRemindersDesc: "Enviar recordatorios automáticos",
    weeklyReport: "Reporte semanal", weeklyReportDesc: "Recibe un resumen cada lunes",
    language: "Idioma", languageDesc: "Elige tu idioma preferido",
    theme: "Tema", themeDesc: "Elige tu apariencia preferida",
    light: "Claro", dark: "Oscuro (pronto)", system: "Sistema",
    dangerZone: "Zona de peligro", deleteAccount: "Eliminar cuenta",
    deleteAccountDesc: "Elimina permanentemente tu cuenta y todos los datos. No se puede deshacer.",
    deleteAccountBtn: "Eliminar mi cuenta", exportData: "Exportar datos",
    exportDataDesc: "Descarga todos tus datos como JSON", exportBtn: "Exportar",
    changePassword: "Cambiar contraseña", currentPassword: "Contraseña actual",
    newPassword: "Nueva contraseña", confirmPassword: "Confirmar contraseña", updatePassword: "Actualizar",
    avatar: "Avatar", changeAvatar: "Cambiar avatar",
    dailyGoal: "Meta diaria", dailyGoalDesc: "Cuántas preguntas por día", questionsPerDay: "preguntas/día",
    studyReminders: "Recordatorios de estudio", studyRemindersDesc: "Recordatorios para temas débiles",
    streakReminder: "Recordatorio de racha", streakReminderDesc: "No pierdas tu racha — recordatorio diario",
  },
  ko: {
    pageTitle: "설정", profile: "프로필", classes: "내 수업", notifications: "알림",
    appearance: "외관", account: "계정",
    fullName: "이름", email: "이메일", role: "역할", school: "학교", schoolPlaceholder: "학교 이름",
    saveChanges: "변경 저장", saved: "저장됨!", teacher: "교사", student: "학생",
    addClass: "+ 수업 추가", students: "명", classCode: "코드", editClass: "편집", deleteClass: "삭제",
    emailNotifs: "이메일 알림", emailNotifsDesc: "주간 기억률 보고서 받기",
    pushNotifs: "푸시 알림", pushNotifsDesc: "복습 필요시 알림 받기",
    studentReminders: "학생 알림", studentRemindersDesc: "자동 학습 알림 보내기",
    weeklyReport: "주간 보고서", weeklyReportDesc: "매주 월요일 요약 받기",
    language: "언어", languageDesc: "선호 언어를 선택하세요",
    theme: "테마", themeDesc: "선호 외관을 선택하세요",
    light: "라이트", dark: "다크 (준비 중)", system: "시스템",
    dangerZone: "위험 구역", deleteAccount: "계정 삭제",
    deleteAccountDesc: "계정과 모든 데이터를 영구 삭제합니다. 되돌릴 수 없습니다.",
    deleteAccountBtn: "내 계정 삭제", exportData: "데이터 내보내기",
    exportDataDesc: "모든 데이터를 JSON으로 다운로드", exportBtn: "내보내기",
    changePassword: "비밀번호 변경", currentPassword: "현재 비밀번호",
    newPassword: "새 비밀번호", confirmPassword: "비밀번호 확인", updatePassword: "업데이트",
    avatar: "아바타", changeAvatar: "아바타 변경",
    dailyGoal: "일일 목표", dailyGoalDesc: "하루에 몇 문제를 풀 건가요", questionsPerDay: "문제/일",
    studyReminders: "학습 알림", studyRemindersDesc: "약한 주제 연습 알림 받기",
    streakReminder: "연속 알림", streakReminderDesc: "연속 기록 유지 — 매일 알림",
  },
};

const css = `
  .st-tab { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .st-tab:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .st-tab:active { transform: scale(.96); }
  .st-section { transition: all .2s ease; }
  .st-section:hover { border-color: #2383E233 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .st-row { transition: all .15s ease; }
  .st-row:hover { background: #FAFBFF !important; }
  .st-btn { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .st-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .st-btn:active { transform: translateY(0) scale(.97); }
  .st-btn-secondary { transition: all .15s ease; cursor: pointer; font-family: 'Outfit',sans-serif; }
  .st-btn-secondary:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .st-btn-danger { transition: all .15s ease; cursor: pointer; font-family: 'Outfit',sans-serif; }
  .st-btn-danger:hover { background: #E03E3E !important; color: #fff !important; }
  .st-pill { transition: all .15s ease; cursor: pointer; }
  .st-pill:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .st-class { transition: all .15s ease; }
  .st-class:hover { background: #E8F0FE !important; }
  .st-toggle { transition: background .2s ease; cursor: pointer; }
  .st-toggle:hover { filter: brightness(.95); }
  .st-input { transition: border-color .15s, box-shadow .15s; }
  .st-input:hover { border-color: #2383E266 !important; }
  .st-input:focus { border-color: #2383E2 !important; box-shadow: 0 0 0 3px #E8F0FE !important; }
  .st-lang { transition: all .12s ease; cursor: pointer; }
  .st-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp .3s ease-out both; }
`;

const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };

const MOCK_CLASSES = [
  { name: "8th Grade History, Period 2", grade: "8th", subject: "History", code: "HIST-8A", students: 28 },
  { name: "8th Grade History, Period 5", grade: "8th", subject: "History", code: "HIST-8B", students: 31 },
  { name: "9th Grade World Studies", grade: "9th", subject: "History", code: "WRLD-9A", students: 24 },
];

// ─── Sub-components ─────────────────────────────────
function PageHeader({ title, icon, lang, setLang }) {
  return (
    <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "14px 28px", margin: "-28px -20px 24px -20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CIcon name={icon} size={28} />
          <h1 style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 700 }}>{title}</h1>
        </div>
        <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3 }}>
          {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([c, l]) => (
            <button key={c} className="st-lang" onClick={() => setLang(c)} style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: lang === c ? C.bg : "transparent", color: lang === c ? C.text : C.textMuted,
              border: "none", boxShadow: lang === c ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

const Toggle = ({ on, onToggle }) => (
  <button className="st-toggle" onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 12, padding: 2, background: on ? C.accent : C.border, border: "none", display: "flex", alignItems: "center" }}>
    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", transform: on ? "translateX(20px)" : "translateX(0)", transition: "transform .2s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
  </button>
);

const Section = ({ title, children, style = {}, icon }) => (
  <div className="st-section" style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16, boxShadow: C.shadow, ...style }}>
    {title && <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>{icon && <CIcon name={icon} size={16} inline />} {title}</h3>}
    {children}
  </div>
);

const SettingRow = ({ label, desc, right }) => (
  <div className="st-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 12px", borderRadius: 8, marginBottom: 2 }}>
    <div style={{ flex: 1, marginRight: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
      {desc && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{desc}</div>}
    </div>
    {right}
  </div>
);

// ─── Tab icons map ──────────────────────────────────
const TAB_ICONS = { profile: "student", classes: "book", notifications: "bell", appearance: "paint", account: "shield" };

// ─── Main ───────────────────────────────────────────
export default function Settings({ lang: pageLang = "en", setLang: pageSetLang }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState({ email: true, push: true, studentRemind: false, weekly: true, studyRemind: true, streakRemind: true });
  const [name, setName] = useState("Teacher Name");
  const [email, setEmail] = useState("teacher@school.edu");
  const [school, setSchool] = useState("");

  const t = i18n[l] || i18n.en;
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const tabs = [
    ["profile", t.profile], ["classes", t.classes], ["notifications", t.notifications],
    ["appearance", t.appearance], ["account", t.account],
  ];

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="settings" lang={l} setLang={setLang} />

      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
          {tabs.map(([id, label]) => (
            <button key={id} className="st-tab" onClick={() => setTab(id)} style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: tab === id ? C.accentSoft : C.bg,
              color: tab === id ? C.accent : C.textSecondary,
              border: `1px solid ${tab === id ? C.accent + "33" : C.border}`,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <CIcon name={TAB_ICONS[id]} size={16} inline /> {label}
            </button>
          ))}
        </div>

        {/* ── Profile ── */}
        {tab === "profile" && (
          <div className="fade-up">
            <Section title={t.profile} icon="student">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.fullName}</label>
                  <input className="st-input" value={name} onChange={e => setName(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.email}</label>
                  <input className="st-input" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.school}</label>
                  <input className="st-input" value={school} onChange={e => setSchool(e.target.value)} placeholder={t.schoolPlaceholder} style={inp} />
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <button className="st-btn" onClick={save} style={{
                  padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, border: "none",
                  background: saved ? C.greenSoft : C.accent, color: saved ? C.green : "#fff",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {saved ? <><CIcon name="check" size={14} inline /> {t.saved}</> : t.saveChanges}
                </button>
              </div>
            </Section>
          </div>
        )}

        {/* ── Classes ── */}
        {tab === "classes" && (
          <div className="fade-up">
            <Section title={t.classes} icon="book">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MOCK_CLASSES.map((cls, i) => (
                  <div key={i} className="st-class" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 10, background: C.bgSoft }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{cls.name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{cls.grade} · {cls.subject} · {cls.students} {t.students}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontFamily: MONO, fontWeight: 600, color: C.accent, padding: "4px 8px", background: C.accentSoft, borderRadius: 6 }}>{cls.code}</span>
                      <button className="st-btn-secondary" style={{ fontSize: 12, color: C.textMuted, background: "transparent", border: `1px solid ${C.border}`, padding: "4px 10px", borderRadius: 6 }}>{t.editClass}</button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="st-btn" style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: C.accentSoft, color: C.accent, width: "100%", border: "none" }}>{t.addClass}</button>
            </Section>
          </div>
        )}

        {/* ── Notifications ── */}
        {tab === "notifications" && (
          <div className="fade-up">
            <Section title={t.notifications} icon="bell">
              <SettingRow label={t.emailNotifs} desc={t.emailNotifsDesc} right={<Toggle on={notifs.email} onToggle={() => setNotifs(p => ({ ...p, email: !p.email }))} />} />
              <SettingRow label={t.pushNotifs} desc={t.pushNotifsDesc} right={<Toggle on={notifs.push} onToggle={() => setNotifs(p => ({ ...p, push: !p.push }))} />} />
              <SettingRow label={t.studentReminders} desc={t.studentRemindersDesc} right={<Toggle on={notifs.studentRemind} onToggle={() => setNotifs(p => ({ ...p, studentRemind: !p.studentRemind }))} />} />
              <SettingRow label={t.weeklyReport} desc={t.weeklyReportDesc} right={<Toggle on={notifs.weekly} onToggle={() => setNotifs(p => ({ ...p, weekly: !p.weekly }))} />} />
            </Section>
          </div>
        )}

        {/* ── Appearance ── */}
        {tab === "appearance" && (
          <div className="fade-up">
            <Section title={t.appearance} icon="paint">
              <SettingRow label={t.language} desc={t.languageDesc} right={
                <div style={{ display: "flex", gap: 4 }}>
                  {[["en", "English"], ["es", "Español"], ["ko", "한국어"]].map(([c, lb]) => (
                    <button key={c} className="st-pill" onClick={() => setLang(c)} style={{
                      padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: l === c ? C.accentSoft : C.bgSoft,
                      color: l === c ? C.accent : C.textMuted,
                      border: `1px solid ${l === c ? C.accent + "33" : C.border}`, cursor: "pointer",
                    }}>{lb}</button>
                  ))}
                </div>
              } />
              <SettingRow label={t.theme} desc={t.themeDesc} right={
                <div style={{ display: "flex", gap: 4 }}>
                  {[[t.light, true], [t.dark, false], [t.system, false]].map(([lb, active], i) => (
                    <button key={i} className="st-pill" style={{
                      padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: active ? C.accentSoft : C.bgSoft,
                      color: active ? C.accent : C.textMuted,
                      border: `1px solid ${active ? C.accent + "33" : C.border}`,
                      opacity: i === 0 ? 1 : 0.5, cursor: i === 0 ? "pointer" : "default",
                    }}>{lb}</button>
                  ))}
                </div>
              } />
            </Section>
          </div>
        )}

        {/* ── Account ── */}
        {tab === "account" && (
          <div className="fade-up">
            <Section title={t.changePassword} icon="shield">
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.currentPassword}</label>
                  <input className="st-input" type="password" placeholder="••••••••" style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.newPassword}</label>
                  <input className="st-input" type="password" placeholder="••••••••" style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.confirmPassword}</label>
                  <input className="st-input" type="password" placeholder="••••••••" style={inp} />
                </div>
                <button className="st-btn" style={{ padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: C.accent, color: "#fff", alignSelf: "flex-start", border: "none" }}>{t.updatePassword}</button>
              </div>
            </Section>

            <Section>
              <SettingRow label={t.exportData} desc={t.exportDataDesc} right={
                <button className="st-btn-secondary" style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: C.bgSoft, color: C.textSecondary, border: `1px solid ${C.border}` }}>{t.exportBtn}</button>
              } />
            </Section>

            <Section title={t.dangerZone} icon="alert" style={{ borderColor: C.red + "33" }}>
              <SettingRow label={t.deleteAccount} desc={t.deleteAccountDesc} right={
                <button className="st-btn-danger" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.redSoft, color: C.red, border: "none" }}>{t.deleteAccountBtn}</button>
              } />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
