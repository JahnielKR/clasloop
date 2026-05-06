import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";
import { Avatar, AvatarPicker, AVATARS, getAvatarById, getDefaultAvatarFor } from "../components/Avatars";
import { uploadProfileAvatar, deleteProfileAvatar } from "../lib/avatar-storage";
import { useIsMobile } from "../components/MobileMenuButton";
import PageHeader from "../components/PageHeader";
import { C } from "../components/tokens";
import useTheme from "../hooks/useTheme";

const i18n = {
  en: {
    pageTitle: "Settings",
    profile: "Profile", appearance: "Appearance", account: "Account", notifications: "Notifications",
    fullName: "Full name", email: "Email", role: "Role", school: "School", schoolPlaceholder: "Your school name",
    saveChanges: "Save changes", saving: "Saving...", saved: "Saved!", teacher: "Teacher", student: "Student",
    language: "Language", languageDesc: "Choose your preferred language",
    theme: "Theme", themeDesc: "Choose your preferred appearance",
    light: "Light", dark: "Dark", system: "System",
    changePassword: "Change password", currentPassword: "Current password",
    newPassword: "New password", confirmPassword: "Confirm password", updatePassword: "Update password",
    updatingPassword: "Updating...", passwordUpdated: "Password updated!", passwordError: "Error updating password",
    passwordMismatch: "Passwords don't match", passwordTooShort: "Password must be at least 6 characters",
    dangerZone: "Danger zone", deleteAccount: "Delete account",
    deleteAccountDesc: "Permanently delete your account and all data. Cannot be undone.",
    deleteAccountBtn: "Delete my account", exportData: "Export data",
    exportDataDesc: "Download all your data as JSON", exportBtn: "Export", exporting: "Exporting...",
    emailNotifs: "Email notifications", emailNotifsDesc: "Receive weekly retention reports",
    pushNotifs: "Review reminders", pushNotifsDesc: "Get reminded when topics need review",
    weeklyReport: "Weekly report", weeklyReportDesc: "Receive a summary every Monday",
    // Student-specific
    dailyGoal: "Daily goal", dailyGoalDesc: "Questions per day", questionsDay: "questions/day",
    studyReminders: "Study reminders", studyRemindersDesc: "Remind me to practice weak topics",
    streakReminder: "Streak reminder", streakReminderDesc: "Daily reminder to maintain streak",
    profilePicture: "Profile picture",
    avatarTabPhoto: "Upload photo", avatarTabAvatar: "Choose avatar",
    avatarUploadHint: "JPG or PNG, max 5 MB. Square crops work best.",
    avatarChoose: "Browse", avatarRemove: "Remove photo", avatarUploading: "Uploading...",
    avatarSaved: "Avatar updated!",
    avatarUseChosen: "Use this avatar",
    avatarLockedHint: "Locked — keep practicing to unlock!",
  },
  es: {
    pageTitle: "Ajustes",
    profile: "Perfil", appearance: "Apariencia", account: "Cuenta", notifications: "Notificaciones",
    fullName: "Nombre completo", email: "Correo", role: "Rol", school: "Escuela", schoolPlaceholder: "Nombre de tu escuela",
    saveChanges: "Guardar", saving: "Guardando...", saved: "¡Guardado!", teacher: "Profesor", student: "Estudiante",
    language: "Idioma", languageDesc: "Elige tu idioma preferido",
    theme: "Tema", themeDesc: "Elige tu apariencia preferida",
    light: "Claro", dark: "Oscuro", system: "Sistema",
    changePassword: "Cambiar contraseña", currentPassword: "Contraseña actual",
    newPassword: "Nueva contraseña", confirmPassword: "Confirmar contraseña", updatePassword: "Actualizar",
    updatingPassword: "Actualizando...", passwordUpdated: "¡Contraseña actualizada!", passwordError: "Error al actualizar",
    passwordMismatch: "Las contraseñas no coinciden", passwordTooShort: "Mínimo 6 caracteres",
    dangerZone: "Zona de peligro", deleteAccount: "Eliminar cuenta",
    deleteAccountDesc: "Elimina tu cuenta y datos permanentemente.",
    deleteAccountBtn: "Eliminar mi cuenta", exportData: "Exportar datos",
    exportDataDesc: "Descarga tus datos como JSON", exportBtn: "Exportar", exporting: "Exportando...",
    emailNotifs: "Notificaciones email", emailNotifsDesc: "Recibe reportes semanales",
    pushNotifs: "Recordatorios de repaso", pushNotifsDesc: "Recordatorios cuando hay temas que repasar",
    weeklyReport: "Reporte semanal", weeklyReportDesc: "Resumen cada lunes",
    dailyGoal: "Meta diaria", dailyGoalDesc: "Preguntas por día", questionsDay: "preguntas/día",
    studyReminders: "Recordatorios", studyRemindersDesc: "Recordar practicar temas débiles",
    streakReminder: "Recordatorio de racha", streakReminderDesc: "Recordatorio diario de racha",
    profilePicture: "Foto de perfil",
    avatarTabPhoto: "Subir foto", avatarTabAvatar: "Elegir avatar",
    avatarUploadHint: "JPG o PNG, máx 5 MB. Las imágenes cuadradas se ven mejor.",
    avatarChoose: "Explorar", avatarRemove: "Quitar foto", avatarUploading: "Subiendo...",
    avatarSaved: "¡Avatar actualizado!",
    avatarUseChosen: "Usar este avatar",
    avatarLockedHint: "Bloqueado — ¡sigue practicando para desbloquear!",
  },
  ko: {
    pageTitle: "설정",
    profile: "프로필", appearance: "외관", account: "계정", notifications: "알림",
    fullName: "이름", email: "이메일", role: "역할", school: "학교", schoolPlaceholder: "학교 이름",
    saveChanges: "저장", saving: "저장 중...", saved: "저장됨!", teacher: "교사", student: "학생",
    language: "언어", languageDesc: "선호 언어를 선택하세요",
    theme: "테마", themeDesc: "선호 외관을 선택하세요",
    light: "라이트", dark: "다크", system: "시스템",
    changePassword: "비밀번호 변경", currentPassword: "현재 비밀번호",
    newPassword: "새 비밀번호", confirmPassword: "비밀번호 확인", updatePassword: "업데이트",
    updatingPassword: "업데이트 중...", passwordUpdated: "비밀번호 업데이트됨!", passwordError: "업데이트 오류",
    passwordMismatch: "비밀번호가 일치하지 않습니다", passwordTooShort: "최소 6자",
    dangerZone: "위험 구역", deleteAccount: "계정 삭제",
    deleteAccountDesc: "계정과 데이터를 영구 삭제합니다.",
    deleteAccountBtn: "내 계정 삭제", exportData: "데이터 내보내기",
    exportDataDesc: "데이터를 JSON으로 다운로드", exportBtn: "내보내기", exporting: "내보내는 중...",
    emailNotifs: "이메일 알림", emailNotifsDesc: "주간 보고서 받기",
    pushNotifs: "복습 알림", pushNotifsDesc: "복습 필요시 알림",
    weeklyReport: "주간 보고서", weeklyReportDesc: "매주 월요일 요약",
    dailyGoal: "일일 목표", dailyGoalDesc: "하루 문제 수", questionsDay: "문제/일",
    studyReminders: "학습 알림", studyRemindersDesc: "약한 주제 연습 알림",
    streakReminder: "연속 알림", streakReminderDesc: "매일 연속 기록 알림",
    profilePicture: "프로필 사진",
    avatarTabPhoto: "사진 업로드", avatarTabAvatar: "아바타 선택",
    avatarUploadHint: "JPG 또는 PNG, 최대 5 MB. 정사각형 이미지가 가장 잘 보입니다.",
    avatarChoose: "찾아보기", avatarRemove: "사진 제거", avatarUploading: "업로드 중...",
    avatarSaved: "아바타가 업데이트되었습니다!",
    avatarUseChosen: "이 아바타 사용",
    avatarLockedHint: "잠김 — 계속 연습하여 잠금을 해제하세요!",
  },
};

const css = `
  .st-tab { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .st-tab:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .st-section { transition: all .2s ease; }
  .st-section:hover { border-color: #2383E233 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .st-row { transition: all .15s ease; }
  .st-row:hover { background: #FAFBFF !important; }
  .st-btn { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .st-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .st-btn:active { transform: translateY(0) scale(.97); }
  .st-btn-secondary:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .st-btn-danger:hover { background: #E03E3E !important; color: #fff !important; }
  .st-pill { transition: all .15s ease; cursor: pointer; }
  .st-pill:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
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

export default function Settings({ lang: pageLang = "en", setLang: pageSetLang, onOpenMobileMenu }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const [tab, setTab] = useState("profile");
  const [theme, setTheme] = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [profileStatus, setProfileStatus] = useState(null); // null | saving | saved

  // Password
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passStatus, setPassStatus] = useState(null); // null | updating | updated | error | mismatch | short

  // Notifications (stored locally for now)
  const [notifs, setNotifs] = useState({ email: true, push: true, weekly: true, studyRemind: true, streakRemind: true });

  // ── Avatar / Profile picture ──
  const [avatarUrl, setAvatarUrl] = useState(null);   // photo URL if any
  const [avatarId, setAvatarId] = useState(null);     // catalog id if no photo
  const [avatarTab, setAvatarTab] = useState("photo"); // "photo" | "avatar"
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState(null); // null | "saved"
  const [unlockedIds, setUnlockedIds] = useState([]); // ids the student has unlocked
  const avatarFileRef = useRef(null);

  const t = i18n[l] || i18n.en;
  const isTeacher = profile?.role === "teacher";

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) {
      setProfile(data);
      setName(data.full_name || "");
      setEmail(user.email || "");
      setSchool(data.school || "");
      setAvatarUrl(data.avatar_url || null);
      setAvatarId(data.avatar_id || null);
      // Default tab: photo if user already has one, otherwise avatar picker.
      setAvatarTab(data.avatar_url ? "photo" : "avatar");
      // Load student's unlocks (only meaningful for students).
      if (data.role === "student") {
        const { data: unlocks } = await supabase
          .from("student_unlocks")
          .select("avatar_id")
          .eq("student_id", user.id);
        if (unlocks) setUnlockedIds(unlocks.map(u => u.avatar_id));
      }
    }
    setLoading(false);
  };

  // ── Avatar handlers ──
  const handleAvatarPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;
    if (file.size > 5 * 1024 * 1024) return; // 5 MB
    setAvatarUploading(true);
    const result = await uploadProfileAvatar(file, profile.id);
    if (result.error) {
      setAvatarUploading(false);
      return;
    }
    // Save to DB and clear avatar_id (photo takes priority)
    const oldUrl = avatarUrl;
    const { error } = await supabase.from("profiles")
      .update({ avatar_url: result.url, avatar_id: null })
      .eq("id", profile.id);
    if (!error) {
      setAvatarUrl(result.url);
      setAvatarId(null);
      setAvatarStatus("saved");
      setTimeout(() => setAvatarStatus(null), 2200);
      // Best-effort cleanup of previous photo
      if (oldUrl && oldUrl !== result.url) deleteProfileAvatar(oldUrl).catch(() => {});
    }
    setAvatarUploading(false);
  };

  const handleAvatarPhotoRemove = async () => {
    if (!profile) return;
    const oldUrl = avatarUrl;
    const { error } = await supabase.from("profiles")
      .update({ avatar_url: null })
      .eq("id", profile.id);
    if (!error) {
      setAvatarUrl(null);
      setAvatarTab("avatar");
      if (oldUrl) deleteProfileAvatar(oldUrl).catch(() => {});
    }
  };

  const handleAvatarSelect = async (id) => {
    if (!profile) return;
    const { error } = await supabase.from("profiles")
      .update({ avatar_id: id, avatar_url: null })
      .eq("id", profile.id);
    if (!error) {
      const oldUrl = avatarUrl;
      setAvatarId(id);
      setAvatarUrl(null);
      setAvatarStatus("saved");
      setTimeout(() => setAvatarStatus(null), 2200);
      if (oldUrl) deleteProfileAvatar(oldUrl).catch(() => {});
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    setProfileStatus("saving");
    const { error } = await supabase.from("profiles").update({
      full_name: name.trim(), school: school.trim(), language: l,
    }).eq("id", profile.id);
    setProfileStatus(error ? null : "saved");
    if (!error) setTimeout(() => setProfileStatus(null), 2000);
  };

  const changeLanguage = (newLang) => {
    setLang(newLang);
    // Persist language preference
    if (profile) {
      supabase.from("profiles").update({ language: newLang }).eq("id", profile.id);
    }
  };

  const updatePassword = async () => {
    if (newPass.length < 6) { setPassStatus("short"); return; }
    if (newPass !== confirmPass) { setPassStatus("mismatch"); return; }
    setPassStatus("updating");
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) { setPassStatus("error"); } else {
      setPassStatus("updated");
      setNewPass(""); setConfirmPass("");
      setTimeout(() => setPassStatus(null), 2000);
    }
  };

  const exportUserData = async () => {
    if (!profile) return;
    const data = { profile };

    if (isTeacher) {
      const { data: classes } = await supabase.from("classes").select("*").eq("teacher_id", profile.id);
      const { data: sessions } = await supabase.from("sessions").select("*").eq("teacher_id", profile.id);
      data.classes = classes;
      data.sessions = sessions;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `clasloop-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="settings" lang={l} setLang={setLang} maxWidth={700} onOpenMobileMenu={onOpenMobileMenu} />
      <p style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>Loading...</p>
    </div>
  );

  const teacherTabs = [["profile", t.profile, "student"], ["notifications", t.notifications, "bell"], ["appearance", t.appearance, "paint"], ["account", t.account, "shield"]];
  const studentTabs = [["profile", t.profile, "student"], ["notifications", t.notifications, "bell"], ["appearance", t.appearance, "paint"], ["account", t.account, "shield"]];
  const tabs = isTeacher ? teacherTabs : studentTabs;

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="settings" lang={l} setLang={setLang} maxWidth={700} onOpenMobileMenu={onOpenMobileMenu} />

      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
          {tabs.map(([id, label, icon]) => (
            <button key={id} className="st-tab" onClick={() => setTab(id)} style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: tab === id ? C.accentSoft : C.bg,
              color: tab === id ? C.accent : C.textSecondary,
              border: `1px solid ${tab === id ? C.accent + "33" : C.border}`,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <CIcon name={icon} size={16} inline /> {label}
            </button>
          ))}
        </div>

        {/* ── Profile ── */}
        {tab === "profile" && (
          <div className="fade-up">
            {/* ── Profile picture ── */}
            <Section title={t.profilePicture} icon="art">
              {/* Hidden file input */}
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarPhotoChange}
                style={{ display: "none" }}
              />

              {/* Current avatar preview + status */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
                <div style={{ flexShrink: 0 }}>
                  <Avatar
                    photoUrl={avatarUrl}
                    id={avatarId}
                    seed={profile?.id}
                    size={96}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{name || profile?.full_name || "—"}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
                    {avatarUrl ? t.avatarTabPhoto : (avatarId ? (getAvatarById(avatarId)?.name?.[l] || avatarId) : "—")}
                  </div>
                  {avatarStatus === "saved" && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "3px 10px", borderRadius: 999,
                      background: C.greenSoft, color: C.green,
                      fontSize: 12, fontWeight: 600,
                    }}>
                      <CIcon name="check" size={12} inline /> {t.avatarSaved}
                    </span>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                {[
                  { id: "photo",  label: t.avatarTabPhoto },
                  { id: "avatar", label: t.avatarTabAvatar },
                ].map(tb => {
                  const isActive = avatarTab === tb.id;
                  return (
                    <button
                      key={tb.id}
                      onClick={() => setAvatarTab(tb.id)}
                      style={{
                        padding: "9px 14px",
                        background: "transparent",
                        border: "none",
                        borderBottom: `2.5px solid ${isActive ? C.accent : "transparent"}`,
                        color: isActive ? C.accent : C.textSecondary,
                        fontSize: 13, fontWeight: 600,
                        fontFamily: "'Outfit',sans-serif",
                        cursor: "pointer",
                        marginBottom: -1,
                      }}
                    >{tb.label}</button>
                  );
                })}
              </div>

              {/* Photo upload tab */}
              {avatarTab === "photo" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>{t.avatarUploadHint}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="st-btn"
                      onClick={() => avatarFileRef.current?.click()}
                      disabled={avatarUploading}
                      style={{
                        padding: "9px 16px", borderRadius: 8,
                        fontSize: 13, fontWeight: 600,
                        background: C.accent, color: "#fff", border: "none",
                        cursor: avatarUploading ? "default" : "pointer",
                        opacity: avatarUploading ? 0.6 : 1,
                        display: "inline-flex", alignItems: "center", gap: 6,
                        fontFamily: "'Outfit',sans-serif",
                      }}
                    >
                      <CIcon name="art" size={14} inline />
                      {avatarUploading ? t.avatarUploading : t.avatarChoose}
                    </button>
                    {avatarUrl && (
                      <button
                        onClick={handleAvatarPhotoRemove}
                        style={{
                          padding: "9px 16px", borderRadius: 8,
                          fontSize: 13, fontWeight: 500,
                          background: "transparent", color: C.red,
                          border: `1px solid ${C.redSoft}`,
                          cursor: "pointer",
                          fontFamily: "'Outfit',sans-serif",
                        }}
                      >{t.avatarRemove}</button>
                    )}
                  </div>
                </div>
              )}

              {/* Avatar picker tab */}
              {avatarTab === "avatar" && (
                <AvatarPicker
                  currentId={avatarUrl ? null : avatarId}
                  unlockedIds={unlockedIds}
                  onSelect={handleAvatarSelect}
                  lang={l}
                  isStudent={!isTeacher}
                  size={64}
                />
              )}
            </Section>

            <Section title={t.profile} icon="student">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.fullName}</label>
                  <input className="st-input" value={name} onChange={e => setName(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.email}</label>
                  <input className="st-input" value={email} disabled style={{ ...inp, opacity: 0.5, cursor: "not-allowed" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.role}</label>
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: C.bgSoft, fontSize: 14, color: C.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
                    <CIcon name={isTeacher ? "teacher" : "student"} size={16} inline />
                    {isTeacher ? t.teacher : t.student}
                  </div>
                </div>
                {isTeacher && (
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.school}</label>
                    <input className="st-input" value={school} onChange={e => setSchool(e.target.value)} placeholder={t.schoolPlaceholder} style={inp} />
                  </div>
                )}
              </div>
              <div style={{ marginTop: 16 }}>
                <button className="st-btn" onClick={saveProfile} style={{
                  padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, border: "none",
                  background: profileStatus === "saved" ? C.greenSoft : C.accent, color: profileStatus === "saved" ? C.green : "#fff",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {profileStatus === "saving" ? t.saving : profileStatus === "saved" ? <><CIcon name="check" size={14} inline /> {t.saved}</> : t.saveChanges}
                </button>
              </div>
            </Section>
          </div>
        )}

        {/* ── Notifications ── */}
        {tab === "notifications" && (
          <div className="fade-up">
            <Section title={t.notifications} icon="bell">
              {isTeacher ? (
                <>
                  <SettingRow label={t.emailNotifs} desc={t.emailNotifsDesc} right={<Toggle on={notifs.email} onToggle={() => setNotifs(p => ({ ...p, email: !p.email }))} />} />
                  <SettingRow label={t.pushNotifs} desc={t.pushNotifsDesc} right={<Toggle on={notifs.push} onToggle={() => setNotifs(p => ({ ...p, push: !p.push }))} />} />
                  <SettingRow label={t.weeklyReport} desc={t.weeklyReportDesc} right={<Toggle on={notifs.weekly} onToggle={() => setNotifs(p => ({ ...p, weekly: !p.weekly }))} />} />
                </>
              ) : (
                <>
                  <SettingRow label={t.studyReminders} desc={t.studyRemindersDesc} right={<Toggle on={notifs.studyRemind} onToggle={() => setNotifs(p => ({ ...p, studyRemind: !p.studyRemind }))} />} />
                  <SettingRow label={t.streakReminder} desc={t.streakReminderDesc} right={<Toggle on={notifs.streakRemind} onToggle={() => setNotifs(p => ({ ...p, streakRemind: !p.streakRemind }))} />} />
                </>
              )}
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
                    <button key={c} className="st-pill" onClick={() => changeLanguage(c)} style={{
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
                  {[[t.light, "light"], [t.dark, "dark"]].map(([lb, val]) => {
                    const active = theme === val;
                    return (
                      <button key={val} className="st-pill" onClick={() => setTheme(val)} style={{
                        padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: active ? C.accentSoft : C.bgSoft,
                        color: active ? C.accent : C.textMuted,
                        border: `1px solid ${active ? C.accent + "33" : C.border}`,
                        cursor: "pointer",
                      }}>{lb}</button>
                    );
                  })}
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
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.newPassword}</label>
                  <input className="st-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••••••" style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.confirmPassword}</label>
                  <input className="st-input" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="••••••••" style={inp} />
                </div>
                {passStatus === "mismatch" && <p style={{ fontSize: 12, color: C.red }}>{t.passwordMismatch}</p>}
                {passStatus === "short" && <p style={{ fontSize: 12, color: C.red }}>{t.passwordTooShort}</p>}
                {passStatus === "error" && <p style={{ fontSize: 12, color: C.red }}>{t.passwordError}</p>}
                {passStatus === "updated" && <p style={{ fontSize: 12, color: C.green }}>{t.passwordUpdated}</p>}
                <button className="st-btn" onClick={updatePassword} disabled={!newPass || !confirmPass} style={{
                  padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, alignSelf: "flex-start",
                  background: passStatus === "updated" ? C.greenSoft : C.accent, color: passStatus === "updated" ? C.green : "#fff",
                  border: "none", opacity: newPass && confirmPass ? 1 : 0.4,
                }}>{passStatus === "updating" ? t.updatingPassword : passStatus === "updated" ? t.passwordUpdated : t.updatePassword}</button>
              </div>
            </Section>

            <Section>
              <SettingRow label={t.exportData} desc={t.exportDataDesc} right={
                <button className="st-btn-secondary" onClick={exportUserData} style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: C.bgSoft, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.exportBtn}</button>
              } />
            </Section>

            <Section title={t.dangerZone} icon="alert" style={{ borderColor: C.red + "33" }}>
              <SettingRow label={t.deleteAccount} desc={t.deleteAccountDesc} right={
                <button className="st-btn-danger" style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.redSoft, color: C.red, border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.deleteAccountBtn}</button>
              } />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
