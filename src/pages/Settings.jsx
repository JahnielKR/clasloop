import { CIcon } from "../components/Icons";
import { useState } from "react";

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
    settings: "Settings",
    profile: "Profile",
    classes: "My Classes",
    notifications: "Notifications",
    appearance: "Appearance",
    account: "Account",
    fullName: "Full name",
    email: "Email",
    role: "Role",
    school: "School",
    schoolPlaceholder: "Your school name",
    saveChanges: "Save changes",
    saved: "Saved!",
    teacher: "Teacher",
    student: "Student",
    addClass: "+ Add class",
    students: "students",
    classCode: "Code",
    editClass: "Edit",
    deleteClass: "Delete",
    confirmDelete: "Are you sure?",
    emailNotifs: "Email notifications",
    emailNotifsDesc: "Receive weekly retention reports via email",
    pushNotifs: "Push notifications",
    pushNotifsDesc: "Get reminded when topics need review",
    studentReminders: "Student reminders",
    studentRemindersDesc: "Send automatic study reminders to students",
    weeklyReport: "Weekly report",
    weeklyReportDesc: "Receive a summary every Monday",
    language: "Language",
    languageDesc: "Choose your preferred language",
    theme: "Theme",
    themeDesc: "Choose your preferred appearance",
    light: "Light",
    dark: "Dark (coming soon)",
    system: "System",
    dangerZone: "Danger zone",
    deleteAccount: "Delete account",
    deleteAccountDesc: "Permanently delete your account and all data. This action cannot be undone.",
    deleteAccountBtn: "Delete my account",
    exportData: "Export data",
    exportDataDesc: "Download all your data as a JSON file",
    exportBtn: "Export",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    updatePassword: "Update password",
    on: "On",
    off: "Off",
    // Student specific
    avatar: "Avatar",
    changeAvatar: "Change avatar",
    dailyGoal: "Daily goal",
    dailyGoalDesc: "How many questions per day",
    questionsPerDay: "questions/day",
    studyReminders: "Study reminders",
    studyRemindersDesc: "Get reminded to practice weak topics",
    streakReminder: "Streak reminder",
    streakReminderDesc: "Don't lose your streak — get reminded daily",
  },
  es: {
    settings: "Ajustes",
    profile: "Perfil",
    classes: "Mis Clases",
    notifications: "Notificaciones",
    appearance: "Apariencia",
    account: "Cuenta",
    fullName: "Nombre completo",
    email: "Correo electrónico",
    role: "Rol",
    school: "Escuela",
    schoolPlaceholder: "Nombre de tu escuela",
    saveChanges: "Guardar cambios",
    saved: "¡Guardado!",
    teacher: "Profesor",
    student: "Estudiante",
    addClass: "+ Agregar clase",
    students: "estudiantes",
    classCode: "Código",
    editClass: "Editar",
    deleteClass: "Eliminar",
    confirmDelete: "¿Estás seguro?",
    emailNotifs: "Notificaciones por email",
    emailNotifsDesc: "Recibe reportes semanales de retención por correo",
    pushNotifs: "Notificaciones push",
    pushNotifsDesc: "Recibe recordatorios cuando los temas necesiten repaso",
    studentReminders: "Recordatorios a estudiantes",
    studentRemindersDesc: "Enviar recordatorios automáticos de estudio",
    weeklyReport: "Reporte semanal",
    weeklyReportDesc: "Recibe un resumen cada lunes",
    language: "Idioma",
    languageDesc: "Elige tu idioma preferido",
    theme: "Tema",
    themeDesc: "Elige tu apariencia preferida",
    light: "Claro",
    dark: "Oscuro (próximamente)",
    system: "Sistema",
    dangerZone: "Zona de peligro",
    deleteAccount: "Eliminar cuenta",
    deleteAccountDesc: "Elimina permanentemente tu cuenta y todos los datos. Esta acción no se puede deshacer.",
    deleteAccountBtn: "Eliminar mi cuenta",
    exportData: "Exportar datos",
    exportDataDesc: "Descarga todos tus datos como archivo JSON",
    exportBtn: "Exportar",
    changePassword: "Cambiar contraseña",
    currentPassword: "Contraseña actual",
    newPassword: "Nueva contraseña",
    confirmPassword: "Confirmar nueva contraseña",
    updatePassword: "Actualizar contraseña",
    on: "On",
    off: "Off",
    avatar: "Avatar",
    changeAvatar: "Cambiar avatar",
    dailyGoal: "Meta diaria",
    dailyGoalDesc: "Cuántas preguntas por día",
    questionsPerDay: "preguntas/día",
    studyReminders: "Recordatorios de estudio",
    studyRemindersDesc: "Recibe recordatorios para practicar temas débiles",
    streakReminder: "Recordatorio de racha",
    streakReminderDesc: "No pierdas tu racha — recibe recordatorios diarios",
  },
  ko: {
    settings: "설정",
    profile: "프로필",
    classes: "내 수업",
    notifications: "알림",
    appearance: "외관",
    account: "계정",
    fullName: "이름",
    email: "이메일",
    role: "역할",
    school: "학교",
    schoolPlaceholder: "학교 이름",
    saveChanges: "변경 저장",
    saved: "저장됨!",
    teacher: "교사",
    student: "학생",
    addClass: "+ 수업 추가",
    students: "명",
    classCode: "코드",
    editClass: "편집",
    deleteClass: "삭제",
    confirmDelete: "확실합니까?",
    emailNotifs: "이메일 알림",
    emailNotifsDesc: "주간 기억률 보고서를 이메일로 받기",
    pushNotifs: "푸시 알림",
    pushNotifsDesc: "주제 복습이 필요할 때 알림 받기",
    studentReminders: "학생 알림",
    studentRemindersDesc: "학생에게 자동 학습 알림 보내기",
    weeklyReport: "주간 보고서",
    weeklyReportDesc: "매주 월요일 요약 받기",
    language: "언어",
    languageDesc: "선호하는 언어를 선택하세요",
    theme: "테마",
    themeDesc: "선호하는 외관을 선택하세요",
    light: "라이트",
    dark: "다크 (준비 중)",
    system: "시스템",
    dangerZone: "위험 구역",
    deleteAccount: "계정 삭제",
    deleteAccountDesc: "계정과 모든 데이터를 영구 삭제합니다. 되돌릴 수 없습니다.",
    deleteAccountBtn: "내 계정 삭제",
    exportData: "데이터 내보내기",
    exportDataDesc: "모든 데이터를 JSON 파일로 다운로드",
    exportBtn: "내보내기",
    changePassword: "비밀번호 변경",
    currentPassword: "현재 비밀번호",
    newPassword: "새 비밀번호",
    confirmPassword: "새 비밀번호 확인",
    updatePassword: "비밀번호 업데이트",
    on: "켜기",
    off: "끄기",
    avatar: "아바타",
    changeAvatar: "아바타 변경",
    dailyGoal: "일일 목표",
    dailyGoalDesc: "하루에 몇 문제를 풀 건가요",
    questionsPerDay: "문제/일",
    studyReminders: "학습 알림",
    studyRemindersDesc: "약한 주제 연습 알림 받기",
    streakReminder: "연속 알림",
    streakReminderDesc: "연속 기록을 잃지 마세요 — 매일 알림",
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'DM Sans',sans-serif;background:${C.bgSoft};color:${C.text};-webkit-font-smoothing:antialiased}
  ::selection{background:${C.accentSoft};color:${C.accent}}
  input,select{font-family:'DM Sans',sans-serif;background:${C.bg};border:1px solid ${C.border};color:${C.text};padding:10px 14px;border-radius:8px;font-size:14px;width:100%;outline:none;transition:border-color .15s,box-shadow .15s}
  input:focus,select:focus{border-color:${C.accent};box-shadow:0 0 0 3px ${C.accentSoft}}
  input::placeholder{color:${C.textMuted}}
  button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none;outline:none;transition:all .15s}
  button:active{transform:scale(.97)}
  @keyframes fi{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  .fi{animation:fi .3s ease-out both}
  .f1{animation:fi .3s ease-out .05s both}
  .f2{animation:fi .3s ease-out .1s both}
`;

const Logo = ({ s = 20 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: s + 4, height: s + 4, borderRadius: 7, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={s*.6} height={s*.6} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8"/><path d="M12 8v4l2.5 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
    <span style={{ fontSize: s*.75, fontWeight: 700, letterSpacing: "-.03em" }}>clasloop</span>
  </div>
);

const LangSw = ({ lang, setLang }) => (
  <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
    {[["en","EN"],["es","ES"],["ko","한"]].map(([c,l]) => (
      <button key={c} onClick={() => setLang(c)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: lang===c?C.bg:"transparent", color: lang===c?C.text:C.textMuted }}>{l}</button>
    ))}
  </div>
);

const Toggle = ({ on, onToggle, label }) => (
  <button onClick={onToggle} style={{
    width: 44, height: 24, borderRadius: 12, padding: 2,
    background: on ? C.accent : C.border, transition: "background .2s",
    display: "flex", alignItems: "center",
  }}>
    <div style={{
      width: 20, height: 20, borderRadius: "50%", background: "#fff",
      transform: on ? "translateX(20px)" : "translateX(0)",
      transition: "transform .2s",
      boxShadow: "0 1px 3px rgba(0,0,0,.15)",
    }} />
  </button>
);

const Section = ({ title, children, style = {} }) => (
  <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16, boxShadow: C.shadow, ...style }}>
    {title && <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{title}</h3>}
    {children}
  </div>
);

const SettingRow = ({ label, desc, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
    <div style={{ flex: 1, marginRight: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
      {desc && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{desc}</div>}
    </div>
    {right}
  </div>
);

const MOCK_CLASSES = [
  { name: "8th Grade History, Period 2", grade: "8th", subject: "History", code: "HIST-8A", students: 28 },
  { name: "8th Grade History, Period 5", grade: "8th", subject: "History", code: "HIST-8B", students: 31 },
  { name: "9th Grade World Studies", grade: "9th", subject: "History", code: "WRLD-9A", students: 24 },
];

export default function App() {
  const [lang, setLang] = useState("en");
  const [role, setRole] = useState("teacher"); // toggle between teacher/student view
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState({ email: true, push: true, studentRemind: false, weekly: true, studyRemind: true, streakRemind: true });
  const [dailyGoal, setDailyGoal] = useState(10);
  const [name, setName] = useState(role === "teacher" ? "Ms. Johnson" : "Carlos R.");
  const [email, setEmail] = useState("johnson@school.edu");
  const [school, setSchool] = useState("Lincoln Middle School");

  const d = i18n[lang];

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const tabs = role === "teacher"
    ? [["profile", "profile", d.profile], ["classes", "book", d.classes], ["notifications", "bell", d.notifications], ["appearance", "paint", d.appearance], ["account", "shield", d.account]]
    : [["profile", "profile", d.profile], ["notifications", "bell", d.notifications], ["appearance", "paint", d.appearance], ["account", "shield", d.account]];

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: C.bgSoft }}>
        {/* Nav */}
        <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Role toggle for demo */}
            <div style={{ display: "flex", gap: 2, background: C.bgSoft, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
              {[["teacher", "teacher"], ["student", "student"]].map(([r, icon]) => (
                <button key={r} onClick={() => { setRole(r); setTab("profile"); setName(r === "teacher" ? "Ms. Johnson" : "Carlos R."); }} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: role === r ? C.bg : "transparent", color: role === r ? C.text : C.textMuted }}>{icon} {r === "teacher" ? d.teacher : d.student}</button>
              ))}
            </div>
            <LangSw lang={lang} setLang={setLang} />
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px" }}>
          <h1 className="fi" style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, fontWeight: 400, marginBottom: 20, letterSpacing: "-.01em" }}><CIcon name="settings" size={22} inline /> {d.settings}</h1>

          {/* Tabs */}
          <div className="f1" style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
            {tabs.map(([id, icon, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: tab === id ? C.accentSoft : C.bg,
                color: tab === id ? C.accent : C.textSecondary,
                border: `1px solid ${tab === id ? C.accent + "33" : C.border}`,
                display: "flex", alignItems: "center", gap: 6,
              }}><CIcon name={icon} size={16} inline /> {label}</button>
            ))}
          </div>

          {/* Profile */}
          {tab === "profile" && (
            <div className="f2">
              <Section title={d.profile}>
                {role === "student" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: 16, borderRadius: 10, background: C.bgSoft }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.purpleSoft, border: `3px solid ${C.purple}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}><CIcon name="student" size={28} inline /></div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>Carlos R.</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>Lv.7 · 1,240 XP</div>
                      <button style={{ fontSize: 12, color: C.accent, fontWeight: 500, background: "transparent", marginTop: 4 }}>{d.changeAvatar} →</button>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.fullName}</label>
                    <input value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.email}</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  {role === "teacher" && (
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.school}</label>
                      <input value={school} onChange={e => setSchool(e.target.value)} placeholder={d.schoolPlaceholder} />
                    </div>
                  )}
                  {role === "student" && (
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.dailyGoal}</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <input type="range" min="5" max="30" step="5" value={dailyGoal} onChange={e => setDailyGoal(+e.target.value)} style={{ flex: 1, border: "none", padding: 0, boxShadow: "none" }} />
                        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: C.accent, minWidth: 80 }}>{dailyGoal} {d.questionsPerDay}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 16 }}>
                  <button onClick={save} style={{
                    padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                    background: saved ? C.greenSoft : C.accent, color: saved ? C.green : "#fff",
                    border: saved ? `1px solid ${C.green}33` : "none",
                  }}>{saved ? "✓ " + d.saved : d.saveChanges}</button>
                </div>
              </Section>
            </div>
          )}

          {/* Classes (teacher only) */}
          {tab === "classes" && role === "teacher" && (
            <div className="f2">
              <Section title={d.classes}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {MOCK_CLASSES.map((cls, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 16px", borderRadius: 10, background: C.bgSoft,
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{cls.name}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                          {cls.grade} · {cls.subject} · {cls.students} {d.students}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontFamily: MONO, fontWeight: 600, color: C.accent, padding: "4px 8px", background: C.accentSoft, borderRadius: 6 }}>{cls.code}</span>
                        <button style={{ fontSize: 12, color: C.textMuted, background: "transparent" }}>{d.editClass}</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button style={{
                  marginTop: 12, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  background: C.accentSoft, color: C.accent, width: "100%",
                }}>{d.addClass}</button>
              </Section>
            </div>
          )}

          {/* Notifications */}
          {tab === "notifications" && (
            <div className="f2">
              <Section title={d.notifications}>
                {role === "teacher" ? (
                  <>
                    <SettingRow label={d.emailNotifs} desc={d.emailNotifsDesc} right={<Toggle on={notifs.email} onToggle={() => setNotifs(p => ({...p, email: !p.email}))} />} />
                    <SettingRow label={d.pushNotifs} desc={d.pushNotifsDesc} right={<Toggle on={notifs.push} onToggle={() => setNotifs(p => ({...p, push: !p.push}))} />} />
                    <SettingRow label={d.studentReminders} desc={d.studentRemindersDesc} right={<Toggle on={notifs.studentRemind} onToggle={() => setNotifs(p => ({...p, studentRemind: !p.studentRemind}))} />} />
                    <SettingRow label={d.weeklyReport} desc={d.weeklyReportDesc} right={<Toggle on={notifs.weekly} onToggle={() => setNotifs(p => ({...p, weekly: !p.weekly}))} />} />
                  </>
                ) : (
                  <>
                    <SettingRow label={d.studyReminders} desc={d.studyRemindersDesc} right={<Toggle on={notifs.studyRemind} onToggle={() => setNotifs(p => ({...p, studyRemind: !p.studyRemind}))} />} />
                    <SettingRow label={d.streakReminder} desc={d.streakReminderDesc} right={<Toggle on={notifs.streakRemind} onToggle={() => setNotifs(p => ({...p, streakRemind: !p.streakRemind}))} />} />
                    <SettingRow label={d.pushNotifs} desc={d.pushNotifsDesc} right={<Toggle on={notifs.push} onToggle={() => setNotifs(p => ({...p, push: !p.push}))} />} />
                  </>
                )}
              </Section>
            </div>
          )}

          {/* Appearance */}
          {tab === "appearance" && (
            <div className="f2">
              <Section title={d.appearance}>
                <SettingRow label={d.language} desc={d.languageDesc} right={
                  <div style={{ display: "flex", gap: 4 }}>
                    {[["en","English"],["es","Español"],["ko","한국어"]].map(([c,l]) => (
                      <button key={c} onClick={() => setLang(c)} style={{
                        padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: lang === c ? C.accentSoft : C.bgSoft,
                        color: lang === c ? C.accent : C.textMuted,
                        border: `1px solid ${lang === c ? C.accent + "33" : C.border}`,
                      }}>{l}</button>
                    ))}
                  </div>
                } />
                <SettingRow label={d.theme} desc={d.themeDesc} right={
                  <div style={{ display: "flex", gap: 4 }}>
                    {[[d.light, true], [d.dark, false], [d.system, false]].map(([l, active], i) => (
                      <button key={i} style={{
                        padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: active ? C.accentSoft : C.bgSoft,
                        color: active ? C.accent : C.textMuted,
                        border: `1px solid ${active ? C.accent + "33" : C.border}`,
                        opacity: i === 0 ? 1 : 0.5,
                      }}>{l}</button>
                    ))}
                  </div>
                } />
              </Section>
            </div>
          )}

          {/* Account */}
          {tab === "account" && (
            <div className="f2">
              <Section title={d.changePassword}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.currentPassword}</label>
                    <input type="password" placeholder="••••••••" />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.newPassword}</label>
                    <input type="password" placeholder="••••••••" />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{d.confirmPassword}</label>
                    <input type="password" placeholder="••••••••" />
                  </div>
                  <button style={{ padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: C.accent, color: "#fff", alignSelf: "flex-start" }}>{d.updatePassword}</button>
                </div>
              </Section>

              <Section>
                <SettingRow label={d.exportData} desc={d.exportDataDesc} right={
                  <button style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: C.bgSoft, color: C.textSecondary, border: `1px solid ${C.border}` }}>{d.exportBtn}</button>
                } />
              </Section>

              <Section title={d.dangerZone} style={{ borderColor: C.red + "33" }}>
                <SettingRow label={d.deleteAccount} desc={d.deleteAccountDesc} right={
                  <button style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.redSoft, color: C.red }}>{d.deleteAccountBtn}</button>
                } />
              </Section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
