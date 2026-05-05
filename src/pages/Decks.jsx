import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";
import { DeckCover, DECK_COLORS, DECK_ICONS, DEFAULT_DECK_COLOR, DEFAULT_DECK_ICON, SUBJ_ICON, SUBJ_COLOR, PRESET_PATTERNS, presetToDataUrl, resolveColor, colorTint } from "../lib/deck-cover";
import { uploadDeckCover, deleteDeckCover } from "../lib/deck-image-upload";
import { analyzeDerivation } from "../lib/deck-derivation";
import MobileMenuButton from "../components/MobileMenuButton";

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D", orangeSoft: "#FFF3E0",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  yellow: "#D4A017", yellowSoft: "#FEF9E7",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B",
  border: "#E8E8E4", shadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const MONO = "'JetBrains Mono', monospace";
const SUBJECTS = ["Math", "Science", "History", "Language", "Geography", "Art", "Music", "Other"];
const GRADES = ["6th-7th", "7th-8th", "8th-9th", "9th-10th", "10th-11th", "11th-12th"];

const ACTIVITY_TYPES = [
  { id: "mcq", icon: "mcq", label: { en: "Multiple Choice", es: "Opción Múltiple", ko: "객관식" } },
  { id: "tf", icon: "truefalse", label: { en: "True / False", es: "Verdadero / Falso", ko: "참 / 거짓" } },
  { id: "fill", icon: "fillblank", label: { en: "Fill in the Blank", es: "Completar", ko: "빈칸 채우기" } },
  { id: "order", icon: "ordering", label: { en: "Put in Order", es: "Ordenar", ko: "순서 맞추기" } },
  { id: "match", icon: "matching", label: { en: "Matching Pairs", es: "Emparejar", ko: "짝 맞추기" } },
  { id: "free", icon: "study", label: { en: "Free Text", es: "Respuesta Libre", ko: "자유 응답" } },
  { id: "sentence", icon: "language", label: { en: "Sentence Builder", es: "Crear Oración", ko: "문장 만들기" } },
  { id: "slider", icon: "speed", label: { en: "Slider Estimate", es: "Estimar (Slider)", ko: "슬라이더 추정" } },
];

const i18n = {
  en: {
    pageTitle: "Decks", subtitle: "Create and manage your question collections",
    myDecks: "My Decks", following: "Following", favorites: "Favorites", create: "+ Create deck",
    search: "Search decks...", filterAll: "All", filterSubject: "Subject", filterClass: "Class", filterAllSubjects: "All subjects", filterAllClasses: "All classes", filterUnassigned: "Unassigned",
    newClass: "+ New class", newClassHint: "You can create a new class from Sessions",
    groupBy: "Group by", groupByClass: "Class", groupBySubject: "Subject", groupByNone: "None",
    noFavorites: "No favorites yet. Save decks from Community to see them here.",
    noFollowing: "Nothing followed yet. Save or copy decks from other teachers to build your following list.",
    badgeCopy: "Copy", badgeFav: "Favorite",
    fromTeacher: "from",
    emptyClassHint: "This class has no decks yet.",
    addDeckToClass: "Create deck for this class",
    favoriteRemove: "Remove from favorites", favoriteAdd: "Add to favorites",
    title: "Title", titlePlaceholder: "e.g. French Revolution Review",
    description: "Description", descPlaceholder: "What this deck covers...",
    addToClass: "Add to class (optional)", noClass: "No class — general deck",
    subject: "Subject", grade: "Grade", language: "Language", tags: "Tags (comma-separated)",
    tagsPlaceholder: "revolution, europe, history",
    activityType: "Activity type", questions: "Questions", addQuestion: "+ Add question",
    questionText: "Question", option: "Option", removeQuestion: "Remove",
    publish: "Save deck", publishing: "Saving...", makePublic: "Make public to community",
    derivIdentical: "Identical to original — cannot publish",
    derivBlocked: "Not enough adaptation — cannot publish",
    derivAdapted: "Will be published as Adapted",
    derivIndependent: "Substantially different — will be published as your own",
    derivStats: "Original coverage: {coverage}% · Your contribution: {contribution}%",
    derivOriginalBy: "Original by",
    derivBlockedHint: "Add or change more questions before publishing. The original creator's work shouldn't be republished as-is.",
    publishBlockedIdentical: "This deck is identical to the original. Modify it before publishing.",
    publishBlockedLowEffort: "This deck still relies heavily on the original. Add more of your own questions before publishing.",
    publishBlockedTooltip: "Modify the deck before publishing.",
    selectSubject: "Select subject...", selectGrade: "Select grade...",
    gradePlaceholder: "e.g. 6th, 7th–9th, Mixed",
    lockedByClass: "Locked — this is set by the selected class.",
    back: "Back", noDecks: "No decks yet. Click Create to make your first one.",
    noFollowing: "You haven't saved any decks from the community yet.",
    private: "Private", public: "Public", delete: "Delete", edit: "Edit",
    questionCount: "questions", launchSession: "Launch in class",
    deleteConfirm: "Delete this deck? This cannot be undone.",
    by: "by",
    customize: "Customize", coverColor: "Cover color", coverIcon: "Cover icon",
    preview: "Preview",
    tabGeneral: "General", tabCustomize: "Customize", tabQuestions: "Questions",
    coverStyle: "Cover style", styleColor: "Color + Icon", stylePreset: "Pattern", styleImage: "Custom image",
    uploadImage: "Upload image", changeImage: "Change", removeImage: "Remove",
    uploadHint: "JPG, PNG or WebP — up to 2 MB",
    uploading: "Uploading...", uploadFailed: "Upload failed. Try a smaller image.",
    presetPatterns: "Choose a pattern",
    incomplete: "Incomplete", complete: "Complete", emptyQ: "(no question text yet)",
    drag: "Drag to reorder",
    addAnother: "+ Add another question",
    chooseType: "Choose a question type", cancel: "Cancel",
    questionsEmpty: "No questions yet. Click \u201cAdd question\u201d below to get started.",
    questionsHint: "Drag to reorder · Click any row to edit",
    multipleCorrect: "Multiple correct answers",
    addOption: "+ Add option", removeOption: "Remove",
    addItem: "+ Add step", addPair: "+ Add pair",
    acceptedAlts: "Accepted alternatives (optional)",
    acceptedAltsHint: "Comma-separated. Any of these will be accepted.",
    freeTextHint: "Students will write a free-form response. No automatic grading.",
    correctAnswers: "Correct answers", correctAnswer: "Correct answer",
    useImageOptions: "Use images instead of text",
    uploadOptionImage: "Upload image", changeOptionImage: "Change", removeOptionImage: "Remove",
    requiredWord: "Required word or phrase", requiredWordPlaceholder: "e.g. ir, however, because",
    minWords: "Minimum words", minWordsHint: "Student's sentence must contain the required word and have at least this many words.",
    sliderMin: "Min", sliderMax: "Max", sliderCorrect: "Correct value", sliderTolerance: "Tolerance (±)", sliderUnit: "Unit (optional)", sliderUnitPlaceholder: "%, kg, years...",
    sentenceHint: "Auto-graded: checks the required word is present and the sentence is long enough.",
    sliderHint: "Student sees a slider from min to max, drags to estimate, ✓ if within tolerance.",
    addQuestionImage: "+ Add image", removeQuestionImage: "Remove image", changeQuestionImage: "Change image",
    questionImageHint: "Optional image displayed with the question",
  },
  es: {
    pageTitle: "Decks", subtitle: "Crea y gestiona tus colecciones de preguntas",
    myDecks: "Mis Decks", following: "Siguiendo", favorites: "Favoritos", create: "+ Crear deck",
    search: "Buscar decks...", filterAll: "Todos", filterSubject: "Materia", filterClass: "Clase", filterAllSubjects: "Todas las materias", filterAllClasses: "Todas las clases", filterUnassigned: "Sin clase",
    newClass: "+ Nueva clase", newClassHint: "Puedes crear una clase nueva desde Sesiones",
    groupBy: "Agrupar por", groupByClass: "Clase", groupBySubject: "Materia", groupByNone: "Ninguno",
    noFavorites: "Aún no tienes favoritos. Guarda decks de la Comunidad para verlos aquí.",
    noFollowing: "Aún no sigues nada. Guarda o copia decks de otros profes para empezar.",
    badgeCopy: "Copia", badgeFav: "Favorito",
    fromTeacher: "de",
    emptyClassHint: "Esta clase aún no tiene decks.",
    addDeckToClass: "Crear deck para esta clase",
    favoriteRemove: "Quitar de favoritos", favoriteAdd: "Agregar a favoritos",
    title: "Título", titlePlaceholder: "ej. Repaso Revolución Francesa",
    description: "Descripción", descPlaceholder: "Qué cubre este deck...",
    addToClass: "Agregar a clase (opcional)", noClass: "Sin clase — deck general",
    subject: "Materia", grade: "Grado", language: "Idioma", tags: "Etiquetas (separadas por coma)",
    tagsPlaceholder: "revolución, europa, historia",
    activityType: "Tipo de actividad", questions: "Preguntas", addQuestion: "+ Agregar pregunta",
    questionText: "Pregunta", option: "Opción", removeQuestion: "Eliminar",
    publish: "Guardar deck", publishing: "Guardando...", makePublic: "Hacer público en comunidad",
    derivIdentical: "Idéntico al original — no se puede publicar",
    derivBlocked: "Adaptación insuficiente — no se puede publicar",
    derivAdapted: "Se publicará como Adaptado",
    derivIndependent: "Sustancialmente diferente — se publicará como tuyo",
    derivStats: "Cobertura del original: {coverage}% · Tu aporte: {contribution}%",
    derivOriginalBy: "Original de",
    derivBlockedHint: "Agrega o cambia más preguntas antes de publicar. El trabajo del autor original no debería re-publicarse tal cual.",
    publishBlockedIdentical: "Este deck es idéntico al original. Modifícalo antes de publicar.",
    publishBlockedLowEffort: "Este deck aún depende mucho del original. Agrega más preguntas propias antes de publicar.",
    publishBlockedTooltip: "Modifica el deck antes de publicar.",
    selectSubject: "Seleccionar materia...", selectGrade: "Seleccionar grado...",
    gradePlaceholder: "ej. 6to, 7mo–9no, Mixto",
    lockedByClass: "Bloqueado — lo define la clase seleccionada.",
    back: "Volver", noDecks: "Sin decks aún. Click Crear para hacer tu primero.",
    noFollowing: "No has guardado decks de la comunidad aún.",
    private: "Privado", public: "Público", delete: "Eliminar", edit: "Editar",
    questionCount: "preguntas", launchSession: "Lanzar en clase",
    deleteConfirm: "¿Eliminar este deck? No se puede deshacer.",
    by: "por",
    customize: "Personalizar", coverColor: "Color de portada", coverIcon: "Icono de portada",
    preview: "Vista previa",
    tabGeneral: "General", tabCustomize: "Personalizar", tabQuestions: "Preguntas",
    coverStyle: "Estilo de portada", styleColor: "Color + Icono", stylePreset: "Patrón", styleImage: "Imagen propia",
    uploadImage: "Subir imagen", changeImage: "Cambiar", removeImage: "Quitar",
    uploadHint: "JPG, PNG o WebP — hasta 2 MB",
    uploading: "Subiendo...", uploadFailed: "Falló la subida. Intenta con una imagen más pequeña.",
    presetPatterns: "Elige un patrón",
    incomplete: "Incompleta", complete: "Lista", emptyQ: "(sin texto de pregunta)",
    drag: "Arrastra para reordenar",
    addAnother: "+ Agregar otra pregunta",
    chooseType: "Elige un tipo de pregunta", cancel: "Cancelar",
    questionsEmpty: "Aún no hay preguntas. Haz click en \u201cAgregar pregunta\u201d abajo para empezar.",
    questionsHint: "Arrastra para reordenar · Haz click en una fila para editarla",
    multipleCorrect: "Múltiples respuestas correctas",
    addOption: "+ Agregar opción", removeOption: "Quitar",
    addItem: "+ Agregar paso", addPair: "+ Agregar par",
    acceptedAlts: "Alternativas aceptadas (opcional)",
    acceptedAltsHint: "Separadas por comas. Cualquiera será aceptada.",
    freeTextHint: "Los estudiantes escribirán una respuesta libre. Sin evaluación automática.",
    correctAnswers: "Respuestas correctas", correctAnswer: "Respuesta correcta",
    useImageOptions: "Usar imágenes en vez de texto",
    uploadOptionImage: "Subir imagen", changeOptionImage: "Cambiar", removeOptionImage: "Quitar",
    requiredWord: "Palabra o frase requerida", requiredWordPlaceholder: "ej. ir, sin embargo, porque",
    minWords: "Mínimo de palabras", minWordsHint: "La oración debe contener la palabra requerida y tener al menos este número de palabras.",
    sliderMin: "Mín", sliderMax: "Máx", sliderCorrect: "Valor correcto", sliderTolerance: "Tolerancia (±)", sliderUnit: "Unidad (opcional)", sliderUnitPlaceholder: "%, kg, años...",
    sentenceHint: "Auto-evaluado: verifica que use la palabra requerida y tenga suficientes palabras.",
    sliderHint: "El estudiante ve un slider de mín a máx, arrastra para estimar. ✓ si está dentro de la tolerancia.",
    addQuestionImage: "+ Agregar imagen", removeQuestionImage: "Quitar imagen", changeQuestionImage: "Cambiar imagen",
    questionImageHint: "Imagen opcional que se muestra con la pregunta",
  },
  ko: {
    pageTitle: "덱", subtitle: "문제 모음을 만들고 관리하세요",
    myDecks: "내 덱", following: "팔로잉", favorites: "즐겨찾기", create: "+ 덱 만들기",
    search: "덱 검색...", filterAll: "전체", filterSubject: "과목", filterClass: "수업", filterAllSubjects: "모든 과목", filterAllClasses: "모든 수업", filterUnassigned: "미지정",
    newClass: "+ 새 수업", newClassHint: "세션에서 새 수업을 만들 수 있습니다",
    groupBy: "그룹화", groupByClass: "수업", groupBySubject: "과목", groupByNone: "없음",
    noFavorites: "아직 즐겨찾기가 없습니다. 커뮤니티에서 덱을 저장하여 여기에 표시하세요.",
    noFollowing: "아직 팔로우한 항목이 없습니다. 다른 선생님의 덱을 저장하거나 복사하여 시작하세요.",
    badgeCopy: "복사", badgeFav: "즐겨찾기",
    fromTeacher: "—",
    emptyClassHint: "이 수업에는 아직 덱이 없습니다.",
    addDeckToClass: "이 수업을 위한 덱 만들기",
    favoriteRemove: "즐겨찾기에서 제거", favoriteAdd: "즐겨찾기에 추가",
    title: "제목", titlePlaceholder: "예: 프랑스 혁명 복습",
    description: "설명", descPlaceholder: "이 덱의 내용...",
    addToClass: "수업에 추가 (선택)", noClass: "수업 없음 — 일반 덱",
    subject: "과목", grade: "학년", language: "언어", tags: "태그 (쉼표 구분)",
    tagsPlaceholder: "혁명, 유럽, 역사",
    activityType: "활동 유형", questions: "문제", addQuestion: "+ 문제 추가",
    questionText: "문제", option: "선택지", removeQuestion: "삭제",
    publish: "덱 저장", publishing: "저장 중...", makePublic: "커뮤니티에 공개",
    derivIdentical: "원본과 동일합니다 — 게시할 수 없습니다",
    derivBlocked: "적응 부족 — 게시할 수 없습니다",
    derivAdapted: "각색됨으로 게시됩니다",
    derivIndependent: "충분히 다릅니다 — 본인의 작품으로 게시됩니다",
    derivStats: "원본 커버리지: {coverage}% · 본인 기여: {contribution}%",
    derivOriginalBy: "원작자:",
    derivBlockedHint: "게시하기 전에 더 많은 문제를 추가하거나 변경하세요. 원작자의 작업을 그대로 재게시해서는 안 됩니다.",
    publishBlockedIdentical: "이 덱은 원본과 동일합니다. 게시하기 전에 수정하세요.",
    publishBlockedLowEffort: "이 덱은 아직 원본에 크게 의존합니다. 게시하기 전에 자신의 문제를 더 추가하세요.",
    publishBlockedTooltip: "게시하기 전에 덱을 수정하세요.",
    selectSubject: "과목 선택...", selectGrade: "학년 선택...",
    gradePlaceholder: "예: 6학년, 7-9학년, 혼합",
    lockedByClass: "잠김 — 선택된 수업이 정합니다.",
    back: "뒤로", noDecks: "아직 덱이 없습니다. 만들기를 클릭하세요.",
    noFollowing: "아직 커뮤니티에서 저장한 덱이 없습니다.",
    private: "비공개", public: "공개", delete: "삭제", edit: "편집",
    questionCount: "문제", launchSession: "수업에서 시작",
    deleteConfirm: "이 덱을 삭제하시겠습니까?",
    by: "",
    customize: "커스터마이즈", coverColor: "커버 색상", coverIcon: "커버 아이콘",
    preview: "미리보기",
    tabGeneral: "일반", tabCustomize: "커스터마이즈", tabQuestions: "문제",
    coverStyle: "커버 스타일", styleColor: "색상 + 아이콘", stylePreset: "패턴", styleImage: "사용자 이미지",
    uploadImage: "이미지 업로드", changeImage: "변경", removeImage: "제거",
    uploadHint: "JPG, PNG, WebP — 최대 2 MB",
    uploading: "업로드 중...", uploadFailed: "업로드 실패. 더 작은 이미지를 시도하세요.",
    presetPatterns: "패턴 선택",
    incomplete: "미완성", complete: "완성", emptyQ: "(문제 텍스트 없음)",
    drag: "드래그하여 순서 변경",
    addAnother: "+ 문제 추가",
    chooseType: "문제 유형 선택", cancel: "취소",
    questionsEmpty: "아직 문제가 없습니다. 아래 \u201c문제 추가\u201d를 눌러 시작하세요.",
    questionsHint: "드래그하여 순서 변경 · 행을 클릭하여 편집",
    multipleCorrect: "정답 여러 개",
    addOption: "+ 선택지 추가", removeOption: "제거",
    addItem: "+ 단계 추가", addPair: "+ 짝 추가",
    acceptedAlts: "허용된 다른 답 (선택)",
    acceptedAltsHint: "쉼표로 구분. 모두 정답으로 인정됩니다.",
    freeTextHint: "학생이 자유롭게 응답합니다. 자동 채점 없음.",
    correctAnswers: "정답", correctAnswer: "정답",
    useImageOptions: "텍스트 대신 이미지 사용",
    uploadOptionImage: "이미지 업로드", changeOptionImage: "변경", removeOptionImage: "제거",
    requiredWord: "필수 단어 또는 구", requiredWordPlaceholder: "예: 가다, 하지만, 왜냐하면",
    minWords: "최소 단어 수", minWordsHint: "학생 문장에 필수 단어가 포함되고 최소 이만큼 단어가 있어야 합니다.",
    sliderMin: "최소", sliderMax: "최대", sliderCorrect: "정답 값", sliderTolerance: "허용 오차 (±)", sliderUnit: "단위 (선택)", sliderUnitPlaceholder: "%, kg, 년...",
    sentenceHint: "자동 채점: 필수 단어 포함 여부와 단어 수를 확인합니다.",
    sliderHint: "학생이 슬라이더를 드래그하여 추정합니다. 허용 오차 내면 ✓.",
    addQuestionImage: "+ 이미지 추가", removeQuestionImage: "이미지 제거", changeQuestionImage: "이미지 변경",
    questionImageHint: "문제에 표시되는 선택적 이미지",
  },
};

const css = `
  .dk-tab { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .dk-tab:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .dk-card { transition: all .2s ease; cursor: pointer; }
  .dk-card:hover { border-color: #2383E244 !important; box-shadow: 0 4px 16px rgba(35,131,226,.1) !important; transform: translateY(-2px); }
  .dk-group-header { transition: all .18s ease; cursor: pointer; }
  .dk-group-header:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,0.06); filter: brightness(0.98); }
  .dk-group-header:active { transform: translateY(0); }
  .dk-plus-tile { position: relative; }
  .dk-plus-tile:hover { background: var(--accent, #2383E2)15 !important; border-color: var(--accent, #2383E2)88 !important; }
  .dk-plus-tile:hover .dk-plus-icon { transform: rotate(180deg) scale(1.08); background: var(--accent, #2383E2)33 !important; box-shadow: 0 0 0 6px var(--accent, #2383E2)10; }
  .dk-plus-tile:active .dk-plus-icon { transform: rotate(180deg) scale(.95); }
  .dk-btn { transition: all .15s ease; cursor: pointer; border: none; font-family: 'Outfit',sans-serif; }
  .dk-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
  .dk-btn-secondary:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .dk-btn-danger:hover { background: #E03E3E !important; color: #fff !important; }
  .dk-pill { transition: all .15s ease; cursor: pointer; }
  .dk-pill:hover { background: #E8F0FE !important; border-color: #2383E244 !important; color: #2383E2 !important; }
  .dk-color-swatch:hover { transform: scale(1.1); }
  .dk-color-swatch:active { transform: scale(.95); }
  .dk-icon-btn:hover { background: #F5F9FF !important; border-color: #2383E2 !important; transform: translateY(-1px); }
  .dk-icon-btn:active { transform: scale(.95); }
  .dk-editor-tab:hover { color: #2383E2 !important; }
  .dk-mode-btn:hover { transform: translateY(-1px); }
  .dk-mode-btn:active { transform: scale(.97); }
  .dk-preset-btn:hover { transform: scale(1.04); box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }
  .dk-preset-btn:active { transform: scale(.97); }
  .dk-q-row { transition: background .15s ease, border-color .15s ease, box-shadow .2s ease, transform .12s ease; position: relative; }
  .dk-q-row:hover { border-color: #2383E266 !important; box-shadow: 0 4px 14px rgba(35,131,226,0.10); transform: translateY(-1px); }
  .dk-q-row[data-expanded="true"] { border-color: #2383E2 !important; box-shadow: 0 6px 18px rgba(35,131,226,0.15); }
  .dk-q-row[data-dragging="true"] { opacity: .4; transform: scale(.98); }
  .dk-q-ghost {
    position: fixed;
    pointer-events: none;
    z-index: 9999;
    transform: rotate(1.5deg) scale(1.02);
    transition: none;
    box-shadow: 0 14px 40px rgba(35,131,226,0.35), 0 4px 12px rgba(0,0,0,0.15);
    border-radius: 10px;
    overflow: hidden;
    opacity: 0.95;
  }
  .dk-q-ghost > * { background: #FFFFFF !important; }
  .dk-q-row[data-drop-target="true"]::before {
    content: "";
    position: absolute;
    top: -4px; left: 0; right: 0;
    height: 3px;
    background: #2383E2;
    border-radius: 2px;
    box-shadow: 0 0 8px #2383E266;
  }
  .dk-q-header { cursor: pointer; user-select: none; }
  .dk-q-handle { cursor: grab; color: #9B9B9B; transition: color .15s ease, transform .15s ease; }
  .dk-q-row:hover .dk-q-handle { color: #2383E2; }
  .dk-q-handle:hover { color: #2383E2 !important; transform: scale(1.15); }
  .dk-q-handle:active { cursor: grabbing; }
  .dk-q-toggle:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  .dk-q-delete:hover { background: #FDECEC !important; color: #E03E3E !important; }
  .dk-type-card:hover { border-color: #2383E2 !important; background: #F5F9FF !important; transform: translateY(-2px); box-shadow: 0 4px 14px rgba(35,131,226,0.15); }
  .dk-type-card:active { transform: scale(.97); }
  .dk-add-another:hover { background: #E8F0FE !important; border-color: #2383E2 !important; }
  .dk-add-another:active { transform: scale(.99); }
  .dk-add-mini { transition: all .15s ease; }
  .dk-add-mini:hover { background: #E8F0FE !important; border-color: #2383E2 !important; color: #2383E2 !important; }
  .dk-add-mini:active { transform: scale(.97); }
  @keyframes flashGlow {
    0%   { box-shadow: 0 0 0 0 #2383E266, 0 0 18px 6px #2383E244; }
    100% { box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent; }
  }
  .dk-q-flash { animation: flashGlow 1.4s ease-out; }
  .dk-input { transition: border-color .15s, box-shadow .15s; }
  .dk-input:hover { border-color: #2383E266 !important; }
  .dk-input:focus { border-color: #2383E2 !important; box-shadow: 0 0 0 3px #E8F0FE !important; }
  .dk-back { transition: all .15s ease; cursor: pointer; }
  .dk-back:hover { background: #E8F0FE !important; }
  .dk-q-card { transition: all .2s ease; }
  .dk-q-card:hover { border-color: #2383E233 !important; }
  .dk-lang { transition: all .12s ease; cursor: pointer; }
  .dk-lang:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp .3s ease-out both; }
`;

const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };
const sel = { ...inp, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 };
const addMiniBtn = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
  background: "transparent", color: C.accent,
  border: `1px dashed ${C.accent}66`, cursor: "pointer",
  fontFamily: "'Outfit',sans-serif",
};
const miniDeleteBtn = {
  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
  background: "transparent", color: C.textMuted,
  border: "none", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 0,
};
const iconOverImageBtn = {
  width: 24, height: 24, borderRadius: 6,
  background: "rgba(0,0,0,0.5)", color: "#fff",
  border: "none", cursor: "pointer", padding: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  backdropFilter: "blur(4px)",
};

const LangBadge = ({ lang }) => {
  const l = { en: "EN", es: "ES", ko: "한" };
  const c = { en: C.accent, es: C.orange, ko: C.green };
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: (c[lang] || C.accent) + "14", color: c[lang] || C.accent }}>{l[lang] || lang}</span>;
};

function PageHeader({ title, icon, lang, setLang, maxWidth = 800, onOpenMobileMenu }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, maxWidth, margin: "0 auto 24px", paddingBottom: 18, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <MobileMenuButton onOpen={onOpenMobileMenu} />
        <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 10 }}>
          <CIcon name={icon} size={22} /> {title}
        </h1>
      </div>
      <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ ...sel, width: "auto", fontSize: 12, padding: "6px 26px 6px 10px" }}>
        <option value="en">EN</option><option value="es">ES</option><option value="ko">한</option>
      </select>
    </div>
  );
}

// ─── Create Deck Editor ─────────────────────────────
// ─── Live preview of a deck card while editing ──────────────────────────────
function DeckCardPreview({ title, description, cover_color, cover_icon, cover_image_url, subject, grade, language, questionCount, t }) {
  const deckLike = { cover_color, cover_icon, cover_image_url, subject };
  const tint = colorTint(deckLike, "0F"); // ~6% tint
  const langCode = (language || "en").toUpperCase().slice(0, 2);
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{t.preview}</div>
      <div style={{
        background: C.bg,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}>
        <DeckCover deck={deckLike} variant="banner" height={92} radius={14} />
        <div style={{ padding: 16, background: tint, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          {description && <p style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4, margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{description}</p>}
          <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
            {subject || "—"} {grade && `· ${grade}`} · {questionCount} {t.questionCount} · <span style={{ padding: "1px 5px", borderRadius: 4, background: C.bgSoft, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.textSecondary, border: `1px solid ${C.border}` }}>{langCode}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Auto-resizing textarea ─────────────────────────────────────────────────
// Grows with content. Useful for question text where length varies a lot
// (one-liners → "MCQ" vs paragraph-length → word problems).
function AutoResizeTextarea({ value, onChange, placeholder, minHeight = 44, maxHeight = 320, autoFocus = false, style = {}, ...rest }) {
  const ref = useRef(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(maxHeight, Math.max(minHeight, el.scrollHeight));
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  };
  useEffect(resize, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      rows={1}
      style={{
        ...inp,
        resize: "none",
        lineHeight: 1.5,
        minHeight,
        overflowY: "hidden",
        ...style,
      }}
      {...rest}
    />
  );
}

function CreateDeckEditor({ t, l, onBack, onCreated, userId, userClasses, existingDeck, prefilledClassId = null }) {
  const [title, setTitle] = useState(existingDeck?.title || "");
  const [desc, setDesc] = useState(existingDeck?.description || "");
  // If we're creating fresh AND a class was pre-selected (came from "Add deck"
  // CTA inside an empty class group), copy the class's subject/grade as initial
  // values. The editor will lock these because classId is set.
  const prefilledClass = prefilledClassId ? userClasses.find(c => c.id === prefilledClassId) : null;
  const [subject, setSubject] = useState(existingDeck?.subject || prefilledClass?.subject || "");
  const [grade, setGrade] = useState(existingDeck?.grade || prefilledClass?.grade || "");
  const [deckLang, setDeckLang] = useState(existingDeck?.language || l);
  const [tags, setTags] = useState((existingDeck?.tags || []).join(", "));
  const [classId, setClassId] = useState(existingDeck?.class_id || prefilledClassId || "");
  const [makePublic, setMakePublic] = useState(existingDeck?.is_public || false);
  const [activityType, setActivityType] = useState(existingDeck?.questions?.[0]?.type || "mcq");
  const [questions, setQuestions] = useState(existingDeck?.questions || []);
  const [saving, setSaving] = useState(false);
  const [coverColor, setCoverColor] = useState(existingDeck?.cover_color || DEFAULT_DECK_COLOR);
  const [coverIcon, setCoverIcon] = useState(existingDeck?.cover_icon || (existingDeck?.subject && SUBJ_ICON[existingDeck.subject]) || DEFAULT_DECK_ICON);
  const [coverImageUrl, setCoverImageUrl] = useState(existingDeck?.cover_image_url || "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [editorTab, setEditorTab] = useState("general");
  const fileInputRef = useRef(null);

  // ── Derivation tracking ──
  // If this deck is a copy of someone else's, fetch the original's questions
  // so we can show live feedback on whether the user has adapted it enough to
  // publish, and how it would be attributed in Community.
  const copiedFromId = existingDeck?.copied_from_id || null;
  const [originalQuestions, setOriginalQuestions] = useState(null);
  const [originalAuthorName, setOriginalAuthorName] = useState("");
  useEffect(() => {
    if (!copiedFromId) return;
    (async () => {
      const { data } = await supabase
        .from("decks")
        .select("questions, profiles(full_name)")
        .eq("id", copiedFromId)
        .maybeSingle();
      if (data) {
        setOriginalQuestions(data.questions || []);
        setOriginalAuthorName(data.profiles?.full_name || "");
      }
    })();
  }, [copiedFromId]);

  // Live derivation analysis as the user edits questions.
  const derivation = (copiedFromId && originalQuestions)
    ? analyzeDerivation(originalQuestions, questions)
    : null;

  // ── Question list UX (expand/drag/scroll) ──
  const [expandedQ, setExpandedQ] = useState(null); // index of currently expanded question
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [flashIndex, setFlashIndex] = useState(null); // briefly highlights newly added question
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const questionRefs = useRef({});
  const typeSelectorRef = useRef(null);

  // Build a blank question of the given type (defaults to mcq).
  const blankQuestion = (type) => {
    if (type === "tf")    return { type: "tf",    q: "", correct: true };
    if (type === "fill")  return { type: "fill",  q: "", answer: "", alternatives: [] };
    if (type === "order") return { type: "order", q: "", items: ["", "", "", ""] };
    if (type === "match") return { type: "match", q: "", pairs: [{ left: "", right: "" }, { left: "", right: "" }, { left: "", right: "" }] };
    if (type === "free")  return { type: "free",  q: "" };
    if (type === "sentence") return { type: "sentence", q: "", required_word: "", min_words: 3 };
    if (type === "slider") return { type: "slider", q: "", min: 0, max: 100, correct: 50, tolerance: 5, unit: "" };
    return { type: "mcq", q: "", options: ["", "", "", ""], correct: 0, multi: false };
  };

  const addQuestion = (type) => {
    const newQ = blankQuestion(type);
    setQuestions(prev => {
      const newIdx = prev.length;
      setExpandedQ(newIdx);
      setFlashIndex(newIdx);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          questionRefs.current[newIdx]?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
      setTimeout(() => setFlashIndex(null), 1400);
      return [...prev, newQ];
    });
    setShowTypeSelector(false);
  };

  const openTypeSelector = () => {
    setShowTypeSelector(true);
    // Scroll to the selector after it mounts so user sees it without effort.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        typeSelectorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  const updateQ = (idx, field, val) => setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  const updateOption = (qIdx, optIdx, val) => setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === optIdx ? val : o) } : q));
  const updateItem = (qIdx, itemIdx, val) => setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, items: q.items.map((it, j) => j === itemIdx ? val : it) } : q));
  const updatePair = (qIdx, pairIdx, side, val) => setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, pairs: q.pairs.map((p, j) => j === pairIdx ? { ...p, [side]: val } : p) } : q));

  // ── Dynamic add/remove for options, items, pairs ──
  const MAX_OPTIONS = 8;
  const MAX_ITEMS = 12;
  const MAX_PAIRS = 12;

  const addOption = (qIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx || (q.options || []).length >= MAX_OPTIONS) return q;
    return { ...q, options: [...(q.options || []), ""] };
  }));

  const removeOption = (qIdx, optIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    const opts = q.options || [];
    if (opts.length <= 2) return q;
    const newOpts = opts.filter((_, j) => j !== optIdx);
    // Adjust correct index/array.
    let newCorrect = q.correct;
    if (Array.isArray(q.correct)) {
      newCorrect = q.correct
        .filter(idx => idx !== optIdx)
        .map(idx => idx > optIdx ? idx - 1 : idx);
    } else if (typeof q.correct === "number") {
      if (q.correct === optIdx) newCorrect = 0;
      else if (q.correct > optIdx) newCorrect = q.correct - 1;
    }
    return { ...q, options: newOpts, correct: newCorrect };
  }));

  const addItem = (qIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx || (q.items || []).length >= MAX_ITEMS) return q;
    return { ...q, items: [...(q.items || []), ""] };
  }));

  const removeItem = (qIdx, itemIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    const items = q.items || [];
    if (items.length <= 2) return q;
    return { ...q, items: items.filter((_, j) => j !== itemIdx) };
  }));

  const addPair = (qIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx || (q.pairs || []).length >= MAX_PAIRS) return q;
    return { ...q, pairs: [...(q.pairs || []), { left: "", right: "" }] };
  }));

  const removePair = (qIdx, pairIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    const pairs = q.pairs || [];
    if (pairs.length <= 2) return q;
    return { ...q, pairs: pairs.filter((_, j) => j !== pairIdx) };
  }));

  // Toggle MCQ between single/multi. When switching to multi, convert number to array.
  // When switching to single, take the first array element.
  const toggleMcqMulti = (qIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    const willBeMulti = !q.multi;
    let nextCorrect = q.correct;
    if (willBeMulti) {
      nextCorrect = Array.isArray(q.correct) ? q.correct : (typeof q.correct === "number" ? [q.correct] : [0]);
    } else {
      nextCorrect = Array.isArray(q.correct) ? (q.correct[0] ?? 0) : (typeof q.correct === "number" ? q.correct : 0);
    }
    return { ...q, multi: willBeMulti, correct: nextCorrect };
  }));

  const toggleMcqCorrect = (qIdx, optIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    if (q.multi || Array.isArray(q.correct)) {
      const set = new Set(Array.isArray(q.correct) ? q.correct : []);
      if (set.has(optIdx)) set.delete(optIdx); else set.add(optIdx);
      // Always keep at least one correct? Allow zero for now; isQComplete enforces.
      return { ...q, correct: Array.from(set).sort((a, b) => a - b) };
    }
    return { ...q, correct: optIdx };
  }));

  const isMcqCorrect = (q, optIdx) => {
    if (Array.isArray(q.correct)) return q.correct.includes(optIdx);
    return q.correct === optIdx;
  };

  // Detect whether an MCQ is in image-mode (any option is an object with image_url
  // OR explicit q.image_options flag from the toggle).
  const isMcqImageMode = (q) => {
    if (q.image_options === true) return true;
    if (q.image_options === false) return false;
    return Array.isArray(q.options) && q.options.some(o => typeof o === "object" && o?.image_url);
  };

  // Toggle MCQ between text and image options. Convert format both ways without
  // losing data the user has entered.
  const toggleMcqImageMode = (qIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    const willBeImage = !isMcqImageMode(q);
    const newOptions = (q.options || []).map(o => {
      if (willBeImage) {
        // Convert "text" → { text: "text", image_url: null } so existing labels are preserved.
        if (typeof o === "string") return { text: o, image_url: null };
        return o; // already object
      }
      // Going back to text-only: keep .text if present, otherwise empty string.
      if (typeof o === "object") return o.text || "";
      return o;
    });
    return { ...q, options: newOptions, image_options: willBeImage };
  }));

  // Set image URL for a specific MCQ option (called after upload).
  const setOptionImage = (qIdx, optIdx, url) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    return {
      ...q,
      options: q.options.map((o, j) => {
        if (j !== optIdx) return o;
        const base = typeof o === "object" ? o : { text: o };
        return { ...base, image_url: url };
      }),
    };
  }));

  // Per-option upload state — { "qi:oi": true } while uploading.
  const [optionUploading, setOptionUploading] = useState({});
  const optionFileRef = useRef(null);
  const optionUploadTargetRef = useRef(null); // { qi, oi }

  const triggerOptionUpload = (qi, oi) => {
    optionUploadTargetRef.current = { qi, oi };
    optionFileRef.current?.click();
  };

  const handleOptionFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const target = optionUploadTargetRef.current;
    if (!target) return;
    const key = `${target.qi}:${target.oi}`;
    setOptionUploading(prev => ({ ...prev, [key]: true }));
    const result = await uploadDeckCover(file, userId);
    setOptionUploading(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
    if (!result.error) {
      // Delete previous custom image if any (best-effort).
      setQuestions(prev => {
        const q = prev[target.qi];
        const prevUrl = q?.options?.[target.oi]?.image_url;
        if (prevUrl && !prevUrl.startsWith("preset:")) {
          deleteDeckCover(prevUrl).catch(() => {});
        }
        return prev;
      });
      setOptionImage(target.qi, target.oi, result.url);
    }
  };

  const removeOptionImage = (qIdx, optIdx) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qIdx) return q;
    const opt = q.options[optIdx];
    if (typeof opt === "object" && opt?.image_url) {
      deleteDeckCover(opt.image_url).catch(() => {});
    }
    return {
      ...q,
      options: q.options.map((o, j) => {
        if (j !== optIdx) return o;
        if (typeof o === "object") return { ...o, image_url: null };
        return o;
      }),
    };
  }));

  // ── Question-level image (attached to the question itself, not options) ──
  const [qImageUploading, setQImageUploading] = useState({}); // { qi: true }
  const qImageFileRef = useRef(null);
  const qImageTargetRef = useRef(null); // { qi }

  const triggerQImageUpload = (qi) => {
    qImageTargetRef.current = { qi };
    qImageFileRef.current?.click();
  };

  const handleQImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const target = qImageTargetRef.current;
    if (!target) return;
    setQImageUploading(prev => ({ ...prev, [target.qi]: true }));
    const result = await uploadDeckCover(file, userId);
    setQImageUploading(prev => {
      const { [target.qi]: _, ...rest } = prev;
      return rest;
    });
    if (!result.error) {
      // Best-effort: delete previous question image if any.
      setQuestions(prev => {
        const prevUrl = prev[target.qi]?.image_url;
        if (prevUrl) deleteDeckCover(prevUrl).catch(() => {});
        return prev.map((q, i) => i === target.qi ? { ...q, image_url: result.url } : q);
      });
    }
  };

  const removeQImage = (qi) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qi) return q;
    if (q.image_url) deleteDeckCover(q.image_url).catch(() => {});
    return { ...q, image_url: null };
  }));

  const removeQ = (idx) => {
    setQuestions(prev => {
      const removed = prev[idx];
      // Best-effort cleanup of any uploaded images attached to this question.
      if (removed?.image_url) deleteDeckCover(removed.image_url).catch(() => {});
      if (Array.isArray(removed?.options)) {
        removed.options.forEach(o => {
          if (typeof o === "object" && o?.image_url) deleteDeckCover(o.image_url).catch(() => {});
        });
      }
      return prev.filter((_, i) => i !== idx);
    });
    setExpandedQ(curr => curr === idx ? null : (curr !== null && curr > idx ? curr - 1 : curr));
  };

  // Move question from `from` index to `to` index (drag-to-reorder).
  const moveQuestion = (from, to) => {
    if (from === to || from < 0 || to < 0) return;
    setQuestions(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    // Keep expansion stable: follow the dragged item to its new index.
    setExpandedQ(curr => {
      if (curr === null) return null;
      if (curr === from) return to;
      if (from < curr && to >= curr) return curr - 1;
      if (from > curr && to <= curr) return curr + 1;
      return curr;
    });
  };

  // Validate completeness of a question (all required fields filled).
  const isQComplete = (q) => {
    if (!q?.q?.trim()) return false;
    const type = q.type || "mcq";
    if (type === "mcq") {
      if (!Array.isArray(q.options) || q.options.length < 2) return false;
      if (!q.options.every(o => (typeof o === "string" ? o.trim() : (o?.text?.trim() || o?.image_url)))) return false;
      // multi: at least one correct, single: a valid index
      if (Array.isArray(q.correct)) return q.correct.length > 0;
      return typeof q.correct === "number" && q.correct >= 0 && q.correct < q.options.length;
    }
    if (type === "tf")    return typeof q.correct === "boolean";
    if (type === "fill")  return !!q.answer?.trim();
    if (type === "order") return Array.isArray(q.items) && q.items.length >= 2 && q.items.every(it => it?.trim());
    if (type === "match") return Array.isArray(q.pairs) && q.pairs.length >= 2 && q.pairs.every(p => p?.left?.trim() && p?.right?.trim());
    if (type === "free")  return true;
    if (type === "sentence") return !!q.required_word?.trim() && Number.isFinite(q.min_words) && q.min_words >= 1;
    if (type === "slider") return Number.isFinite(q.min) && Number.isFinite(q.max) && Number.isFinite(q.correct) && q.max > q.min && q.correct >= q.min && q.correct <= q.max && Number.isFinite(q.tolerance) && q.tolerance >= 0;
    return true;
  };

  // Short preview text for a question type chip.
  const shortType = (q) => {
    const id = q.type || "mcq";
    return ACTIVITY_TYPES.find(a => a.id === id)?.label[l] || id;
  };

  // ── Custom pointer-based drag with a real visual ghost ──
  // Why custom: HTML5 native drag uses a browser-generated "ghost" image that
  // doesn't look like our row, so users only see the cursor moving. With
  // pointer events we render a styled clone that follows the pointer 1:1 and
  // works identically on mouse + touch.
  const dragStateRef = useRef(null); // { fromIdx, ghostEl, offsetX, offsetY }
  const [ghostState, setGhostState] = useState(null); // { x, y, width, html } — for React-controlled ghost

  // Cleanup on unmount in case a drag is in progress.
  useEffect(() => {
    return () => {
      if (dragStateRef.current?.cleanup) dragStateRef.current.cleanup();
    };
  }, []);

  const handleHandlePointerDown = (idx) => (e) => {
    // Only primary mouse button or any touch/pen.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const rowEl = questionRefs.current[idx];
    if (!rowEl) return;

    const rect = rowEl.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDragIndex(idx);
    setGhostState({
      x: e.clientX - offsetX,
      y: e.clientY - offsetY,
      width: rect.width,
      html: rowEl.outerHTML,
    });

    const onMove = (ev) => {
      // Update ghost position.
      setGhostState(prev => prev ? { ...prev, x: ev.clientX - offsetX, y: ev.clientY - offsetY } : prev);

      // Determine drop target: find the row whose vertical midpoint is closest.
      const refs = Object.entries(questionRefs.current)
        .map(([k, el]) => el ? { idx: Number(k), rect: el.getBoundingClientRect() } : null)
        .filter(Boolean)
        .sort((a, b) => a.rect.top - b.rect.top);

      let target = null;
      for (const r of refs) {
        if (ev.clientY < r.rect.top + r.rect.height / 2) { target = r.idx; break; }
      }
      if (target === null && refs.length) target = refs[refs.length - 1].idx + 1;
      // Clamp to valid range
      if (target !== null) {
        const maxIdx = refs.length;
        if (target > maxIdx) target = maxIdx;
        // dragOverIndex is the index where we'd drop INTO
        // Use clamped target for visual feedback (keep behaviour aligned with moveQuestion)
        const visualTarget = Math.min(target, refs.length - 1);
        setDragOverIndex(visualTarget);
      }
    };

    const onUp = (ev) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      // Compute final drop target one more time.
      const refs = Object.entries(questionRefs.current)
        .map(([k, el]) => el ? { idx: Number(k), rect: el.getBoundingClientRect() } : null)
        .filter(Boolean)
        .sort((a, b) => a.rect.top - b.rect.top);

      let target = refs.length;
      for (let i = 0; i < refs.length; i++) {
        if (ev.clientY < refs[i].rect.top + refs[i].rect.height / 2) { target = refs[i].idx; break; }
      }
      // splice semantics: dropping at index N means "insert before current item at N".
      // If we drag from `idx` to `target` and target > idx, the item being moved
      // shifts the destination down by 1 — splice handles it because we remove first then insert.
      if (target !== idx && target !== idx + 1) {
        const finalTarget = target > idx ? target - 1 : target;
        moveQuestion(idx, finalTarget);
      }
      setDragIndex(null);
      setDragOverIndex(null);
      setGhostState(null);
      dragStateRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    dragStateRef.current = {
      fromIdx: idx,
      cleanup: () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      },
    };
  };

  // Keyboard: ESC closes type selector first, then collapses the expanded question.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (showTypeSelector) { setShowTypeSelector(false); return; }
      if (expandedQ !== null) {
        // Don't trigger if user is in a multiline input or textarea — let them dismiss naturally.
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        if (tag === "textarea") return;
        setExpandedQ(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showTypeSelector, expandedQ]);

  // ── Cover image handlers ──
  const handleImagePick = () => fileInputRef.current?.click();

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setUploadError("");
    setUploading(true);
    const prevUrl = coverImageUrl;
    const result = await uploadDeckCover(file, userId);
    setUploading(false);
    if (result.error) {
      setUploadError(t.uploadFailed);
      return;
    }
    setCoverImageUrl(result.url);
    // If we replaced an existing custom upload, delete the old file (best effort).
    if (prevUrl && !prevUrl.startsWith("preset:") && prevUrl !== result.url) {
      deleteDeckCover(prevUrl).catch(() => {});
    }
  };

  const handleSelectPreset = (presetId) => {
    const prevUrl = coverImageUrl;
    setCoverImageUrl(`preset:${presetId}`);
    if (prevUrl && !prevUrl.startsWith("preset:")) {
      deleteDeckCover(prevUrl).catch(() => {});
    }
  };

  const handleClearCover = () => {
    const prevUrl = coverImageUrl;
    setCoverImageUrl("");
    if (prevUrl && !prevUrl.startsWith("preset:")) {
      deleteDeckCover(prevUrl).catch(() => {});
    }
  };

  // Which sub-mode of "Customize" is active.
  const coverMode = !coverImageUrl ? "color" : coverImageUrl.startsWith("preset:") ? "preset" : "image";

  const canSave = title.trim() && subject && grade && questions.length > 0;

  const handleSave = async () => {
    if (!canSave) return;

    // If the user toggled "Make public" but this is a copy that fails the
    // derivation rules, force is_public back to false and warn. This keeps
    // the gate honest even if the toggle wasn't disabled at the right time.
    let finalPublic = makePublic;
    let finalAdapted = false;
    if (makePublic && derivation && !derivation.canPublish) {
      alert(derivation.status === "identical" ? t.publishBlockedIdentical : t.publishBlockedLowEffort);
      finalPublic = false;
    } else if (makePublic && derivation && derivation.showAdaptedBadge) {
      finalAdapted = true;
    }

    setSaving(true);
    const tagArr = tags.split(",").map(t => t.trim()).filter(Boolean);
    const payload = {
      author_id: userId, class_id: classId || null, title: title.trim(), description: desc.trim(),
      subject, grade, language: deckLang, questions, tags: tagArr,
      is_public: finalPublic,
      is_adapted: finalAdapted,
      cover_color: coverColor, cover_icon: coverIcon,
      cover_image_url: coverImageUrl || null,
    };
    if (existingDeck) {
      await supabase.from("decks").update(payload).eq("id", existingDeck.id);
      onCreated({ ...existingDeck, ...payload });
    } else {
      const { data } = await supabase.from("decks").insert(payload).select().single();
      if (data) onCreated(data);
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Hidden file input for MCQ option image uploads */}
      <input
        ref={optionFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleOptionFileChange}
        style={{ display: "none" }}
      />

      {/* Hidden file input for question images (separate from options) */}
      <input
        ref={qImageFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleQImageFileChange}
        style={{ display: "none" }}
      />

      <button className="dk-back" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: C.accent, background: C.accentSoft, border: "none", marginBottom: 20, fontFamily: "'Outfit',sans-serif" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L11 6M5 12L11 18" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {t.back}
      </button>

      <div className="fade-up" style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Outfit'", margin: 0 }}>{existingDeck ? t.edit : t.create}</h2>
          <DeckCover deck={{ cover_color: coverColor, cover_icon: coverIcon, cover_image_url: coverImageUrl, subject }} variant="tile" size={36} radius={9} />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: `1px solid ${C.border}` }}>
          {[
            { id: "general",   label: t.tabGeneral,   icon: "settings" },
            { id: "customize", label: t.tabCustomize, icon: "paint" },
            { id: "questions", label: t.tabQuestions + ` (${questions.length})`, icon: "question" },
          ].map(tab => (
            <button
              key={tab.id}
              className="dk-editor-tab"
              onClick={() => setEditorTab(tab.id)}
              style={{
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                borderBottom: `2.5px solid ${editorTab === tab.id ? C.accent : "transparent"}`,
                color: editorTab === tab.id ? C.accent : C.textSecondary,
                fontSize: 13, fontWeight: 600,
                fontFamily: "'Outfit',sans-serif",
                cursor: "pointer",
                marginBottom: -1,
                display: "flex", alignItems: "center", gap: 6,
                transition: "all .15s ease",
              }}
            >
              <CIcon name={tab.icon} size={14} inline />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: General ── */}
        {editorTab === "general" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.title} *</label>
            <input className="dk-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t.titlePlaceholder} style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.description}</label>
            <textarea className="dk-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder={t.descPlaceholder} style={{ ...inp, minHeight: 60, resize: "vertical" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.addToClass}</label>
            <select className="dk-input" value={classId} onChange={e => {
              const id = e.target.value;
              setClassId(id);
              if (id) {
                const cls = userClasses.find(c => c.id === id);
                if (cls) { setSubject(cls.subject); setGrade(cls.grade); }
              }
            }} style={sel}>
              <option value="">{t.noClass}</option>
              {userClasses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.subject} · {c.grade})</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.subject} *</label>
              <select
                className="dk-input"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={!!classId}
                style={{ ...sel, opacity: classId ? 0.6 : 1, cursor: classId ? "not-allowed" : "pointer" }}
                title={classId ? t.lockedByClass : ""}
              >
                <option value="">{t.selectSubject}</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.grade} *</label>
              <input
                className="dk-input"
                value={grade}
                onChange={e => setGrade(e.target.value)}
                disabled={!!classId}
                placeholder={t.gradePlaceholder}
                style={{ ...inp, opacity: classId ? 0.6 : 1, cursor: classId ? "not-allowed" : "text" }}
                title={classId ? t.lockedByClass : ""}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.language}</label>
              <select className="dk-input" value={deckLang} onChange={e => setDeckLang(e.target.value)} style={sel}>
                <option value="en">English</option><option value="es">Español</option><option value="ko">한국어</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 }}>{t.tags}</label>
            <input className="dk-input" value={tags} onChange={e => setTags(e.target.value)} placeholder={t.tagsPlaceholder} style={inp} />
          </div>

          {/* Make public toggle (lives inside General — affects metadata, not content) */}
          {(() => {
            // For copies of someone else's deck, the publish toggle is gated
            // by the derivation analysis (anti-republish rule). We show the
            // teacher inline why they can or can't publish, and what the
            // attribution will look like.
            const blocked = derivation && !derivation.canPublish;
            const isAdaptedCase = derivation && derivation.canPublish && derivation.showAdaptedBadge;
            const isIndependentCase = derivation && derivation.canPublish && !derivation.showAdaptedBadge;
            const toggleDisabled = blocked;
            const handleToggle = () => {
              if (toggleDisabled) return;
              setMakePublic(!makePublic);
            };
            return (
              <div style={{
                padding: "12px 14px", borderRadius: 10,
                background: blocked ? C.redSoft : C.bgSoft,
                border: `1px solid ${blocked ? C.red + "44" : C.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: blocked ? C.red : C.text }}>{t.makePublic}</div>
                  <button
                    onClick={handleToggle}
                    disabled={toggleDisabled}
                    title={blocked ? t.publishBlockedTooltip : ""}
                    style={{
                      width: 44, height: 24, borderRadius: 12, padding: 2,
                      background: blocked ? C.border : (makePublic ? C.accent : C.border),
                      border: "none", display: "flex", alignItems: "center",
                      cursor: blocked ? "not-allowed" : "pointer",
                      opacity: blocked ? 0.5 : 1,
                    }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", transform: (!blocked && makePublic) ? "translateX(20px)" : "translateX(0)", transition: "transform .2s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
                  </button>
                </div>

                {/* Derivation feedback */}
                {derivation && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${blocked ? C.red + "33" : C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, marginBottom: 6,
                      color: blocked ? C.red : isAdaptedCase ? C.accent : C.green }}>
                      <CIcon name={blocked ? "warning" : isAdaptedCase ? "sparkle" : "check"} size={13} inline />
                      {blocked && (derivation.status === "identical" ? t.derivIdentical : t.derivBlocked)}
                      {isAdaptedCase && t.derivAdapted}
                      {isIndependentCase && t.derivIndependent}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
                      {t.derivStats
                        .replace("{coverage}", derivation.originalCoverage)
                        .replace("{contribution}", derivation.ownContribution)}
                      {originalAuthorName && (isAdaptedCase || blocked) && (
                        <> · {t.derivOriginalBy} <strong>{originalAuthorName}</strong></>
                      )}
                    </div>
                    {blocked && derivation.status !== "identical" && (
                      <div style={{ fontSize: 11, color: C.red, marginTop: 6, lineHeight: 1.5 }}>
                        {t.derivBlockedHint}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        )}

        {/* ── Tab: Customize ── */}
        {editorTab === "customize" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Live preview — full card mock ─────────────────────────── */}
          <DeckCardPreview
            title={title || t.titlePlaceholder}
            description={desc}
            cover_color={coverColor}
            cover_icon={coverIcon}
            cover_image_url={coverImageUrl}
            subject={subject}
            grade={grade}
            language={deckLang}
            questionCount={questions.length}
            t={t}
          />

          {/* Cover style selector ─────────────────────────── */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 8 }}>{t.coverStyle}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[
                { id: "color",  label: t.styleColor,  icon: "paint" },
                { id: "preset", label: t.stylePreset, icon: "sparkle" },
                { id: "image",  label: t.styleImage,  icon: "art" },
              ].map(opt => {
                const active = coverMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className="dk-mode-btn"
                    onClick={() => {
                      if (opt.id === "color")  handleClearCover();
                      if (opt.id === "preset" && coverMode !== "preset") handleSelectPreset(PRESET_PATTERNS[0].id);
                      if (opt.id === "image"  && coverMode !== "image")  handleImagePick();
                    }}
                    style={{
                      padding: "10px 8px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                      background: active ? C.accentSoft : C.bg,
                      color: active ? C.accent : C.textSecondary,
                      border: `1.5px solid ${active ? C.accent : C.border}`,
                      cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      transition: "all .15s ease",
                    }}
                  >
                    <CIcon name={opt.icon} size={14} inline /> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hidden file input (always rendered, triggered by handlers) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            style={{ display: "none" }}
          />

          {/* Color always visible — it tints presets too ─────────── */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.coverColor}</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DECK_COLORS.map(col => (
                <button
                  key={col.id}
                  type="button"
                  aria-label={col.label}
                  title={col.label}
                  onClick={() => setCoverColor(col.id)}
                  className="dk-color-swatch"
                  style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: col.value,
                    border: coverColor === col.id ? `2.5px solid ${C.text}` : `2px solid transparent`,
                    cursor: "pointer", padding: 0,
                    boxShadow: coverColor === col.id ? `0 0 0 2px ${C.bg}, 0 2px 6px ${col.value}55` : `0 1px 3px ${col.value}33`,
                    transition: "all .15s ease",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Mode-specific content */}
          {coverMode === "color" && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.coverIcon}</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4 }}>
                {DECK_ICONS.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    aria-label={ic}
                    title={ic}
                    onClick={() => setCoverIcon(ic)}
                    className="dk-icon-btn"
                    style={{
                      aspectRatio: "1 / 1",
                      borderRadius: 8,
                      background: coverIcon === ic ? C.accentSoft : C.bg,
                      border: `1.5px solid ${coverIcon === ic ? C.accent : C.border}`,
                      cursor: "pointer", padding: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all .15s ease",
                    }}
                  >
                    <CIcon name={ic} size={18} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {coverMode === "preset" && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 6 }}>{t.presetPatterns}</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {PRESET_PATTERNS.map(p => {
                  const active = coverImageUrl === `preset:${p.id}`;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.label}
                      onClick={() => handleSelectPreset(p.id)}
                      className="dk-preset-btn"
                      style={{
                        position: "relative",
                        aspectRatio: "16 / 9",
                        borderRadius: 8,
                        backgroundImage: presetToDataUrl(p.id, resolveColor({ cover_color: coverColor })),
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: active ? `2.5px solid ${C.text}` : `2px solid transparent`,
                        cursor: "pointer", padding: 0,
                        boxShadow: active ? `0 0 0 2px ${C.bg}, 0 2px 6px rgba(0,0,0,0.15)` : "0 1px 3px rgba(0,0,0,0.08)",
                        transition: "all .15s ease",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {coverMode === "image" && (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button
                  type="button"
                  className="dk-btn"
                  onClick={handleImagePick}
                  disabled={uploading}
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                    background: C.accentSoft, color: C.accent, border: `1px solid ${C.accent}33`,
                    cursor: uploading ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    fontFamily: "'Outfit',sans-serif",
                  }}
                >
                  <CIcon name="refresh" size={14} inline />
                  {uploading ? t.uploading : t.changeImage}
                </button>
                <button
                  type="button"
                  className="dk-btn-secondary"
                  onClick={handleClearCover}
                  disabled={uploading}
                  style={{
                    padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                    background: C.bg, color: C.red, border: `1px solid ${C.border}`,
                    cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                  }}
                >
                  {t.removeImage}
                </button>
              </div>
              <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{t.uploadHint}</p>
              {uploadError && <p style={{ fontSize: 12, color: C.red, marginTop: 6 }}>{uploadError}</p>}
            </div>
          )}
        </div>
        )}

        {/* ── Tab: Questions ── */}
        {editorTab === "questions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
            {questions.length === 0 ? t.questionsEmpty : t.questionsHint}
          </p>
        </div>
        )}
      </div>

      {/* Questions list (only on Questions tab) */}
      {editorTab === "questions" && (
      <div className="fade-up" style={{ animationDelay: ".1s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>{t.questions} ({questions.length})</h3>
          <button className="dk-btn" onClick={openTypeSelector} disabled={showTypeSelector} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: showTypeSelector ? C.bgSoft : C.accentSoft, color: showTypeSelector ? C.textMuted : C.accent, opacity: showTypeSelector ? 0.6 : 1 }}>{t.addQuestion}</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {questions.map((q, qi) => {
            const isExpanded = expandedQ === qi;
            const complete = isQComplete(q);
            const dragging = dragIndex === qi;
            const dropTarget = dragOverIndex === qi && dragIndex !== null && dragIndex !== qi;
            return (
              <div
                key={qi}
                ref={(el) => { questionRefs.current[qi] = el; }}
                className={`dk-q-row ${flashIndex === qi ? "dk-q-flash" : ""}`}
                data-dragging={dragging}
                data-drop-target={dropTarget}
                data-expanded={isExpanded}
                style={{
                  background: C.bg, borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  overflow: "hidden",
                }}
              >
                {/* ── Compact row (whole header is clickable to expand) ── */}
                <div
                  className="dk-q-header"
                  onClick={() => setExpandedQ(isExpanded ? null : qi)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}
                >
                  <span
                    className="dk-q-handle"
                    onPointerDown={handleHandlePointerDown(qi)}
                    onClick={(e) => e.stopPropagation()}
                    title={t.drag}
                    aria-label={t.drag}
                    style={{
                      width: 22, height: 22,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      userSelect: "none",
                      touchAction: "none", // critical: prevents scrolling on touch when dragging the handle
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="9" cy="6"  r="1.6" fill="currentColor"/>
                      <circle cx="15" cy="6" r="1.6" fill="currentColor"/>
                      <circle cx="9" cy="12" r="1.6" fill="currentColor"/>
                      <circle cx="15" cy="12" r="1.6" fill="currentColor"/>
                      <circle cx="9" cy="18" r="1.6" fill="currentColor"/>
                      <circle cx="15" cy="18" r="1.6" fill="currentColor"/>
                    </svg>
                  </span>

                  <span style={{
                    width: 28, textAlign: "center", fontSize: 12, fontWeight: 700,
                    color: C.textMuted, fontFamily: MONO, flexShrink: 0,
                  }}>{qi + 1}</span>

                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    padding: "2px 8px", borderRadius: 5,
                    background: C.accentSoft, color: C.accent,
                    flexShrink: 0,
                    fontFamily: "'Outfit',sans-serif",
                  }}>{shortType(q)}</span>

                  {q.image_url && (
                    <span
                      title="Has image"
                      style={{
                        width: 22, height: 18, borderRadius: 4,
                        backgroundImage: `url(${q.image_url})`,
                        backgroundSize: "cover", backgroundPosition: "center",
                        flexShrink: 0,
                        border: `1px solid ${C.border}`,
                      }}
                    />
                  )}

                  <span style={{
                    flex: 1, minWidth: 0,
                    fontSize: 13,
                    color: q.q?.trim() ? C.text : C.textMuted,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{q.q?.trim() || t.emptyQ}</span>

                  <span
                    title={complete ? t.complete : t.incomplete}
                    aria-label={complete ? t.complete : t.incomplete}
                    style={{
                      width: 18, height: 18, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: complete ? C.greenSoft : C.orangeSoft,
                      color: complete ? C.green : C.orange,
                      flexShrink: 0,
                    }}
                  >
                    <CIcon name={complete ? "check" : "warning"} size={11} inline />
                  </span>

                  {/* Chevron is a visual indicator only — entire header is clickable */}
                  <span
                    aria-hidden="true"
                    style={{
                      width: 22, height: 22, borderRadius: 6,
                      color: C.textMuted,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s ease" }}>
                      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>

                  <button
                    className="dk-q-delete"
                    onClick={(e) => { e.stopPropagation(); removeQ(qi); }}
                    aria-label={t.removeQuestion}
                    title={t.removeQuestion}
                    style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: "transparent", color: C.textMuted,
                      border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, padding: 0,
                      transition: "all .15s ease",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6H21M8 6V4C8 3.4 8.4 3 9 3H15C15.6 3 16 3.4 16 4V6M19 6L18 20C18 20.6 17.6 21 17 21H7C6.4 21 6 20.6 6 20L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* ── Expanded editor ── */}
                {isExpanded && (
                  <div style={{ padding: "4px 14px 14px 14px", borderTop: `1px solid ${C.border}`, background: C.bgSoft }}>
                    <div style={{ marginTop: 12 }}>
                      <AutoResizeTextarea
                        value={q.q}
                        onChange={e => updateQ(qi, "q", e.target.value)}
                        placeholder={t.questionText}
                        autoFocus
                        style={{ marginBottom: 8 }}
                      />

                      {/* Question image: preview if present, otherwise add button */}
                      {q.image_url ? (
                        <div style={{
                          position: "relative",
                          marginBottom: 10,
                          borderRadius: 10,
                          overflow: "hidden",
                          border: `1px solid ${C.border}`,
                          background: "#000",
                        }}>
                          <img
                            src={q.image_url}
                            alt=""
                            style={{
                              display: "block", width: "100%", maxHeight: 240,
                              objectFit: "contain", background: C.bg,
                            }}
                          />
                          <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
                            <button
                              type="button"
                              onClick={() => triggerQImageUpload(qi)}
                              title={t.changeQuestionImage}
                              style={iconOverImageBtn}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C14.7614 3 17.2614 4.13579 19.0711 6.04822" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16 4L19 7L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQImage(qi)}
                              title={t.removeQuestionImage}
                              style={iconOverImageBtn}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerQImageUpload(qi)}
                          disabled={!!qImageUploading[qi]}
                          className="dk-add-mini"
                          style={{ ...addMiniBtn, marginBottom: 10 }}
                        >
                          <CIcon name="art" size={12} inline />
                          {qImageUploading[qi] ? t.uploading : t.addQuestionImage}
                        </button>
                      )}
                      {/* MCQ */}
                      {(q.type === "mcq" || (!q.type && activityType === "mcq")) && q.options && (() => {
                        const imageMode = isMcqImageMode(q);
                        return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {/* Toggles row */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: C.textSecondary }}>{t.multipleCorrect}</span>
                              <button onClick={() => toggleMcqMulti(qi)} style={{ width: 38, height: 22, borderRadius: 11, padding: 2, background: q.multi ? C.accent : C.border, border: "none", display: "flex", alignItems: "center", cursor: "pointer" }}>
                                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", transform: q.multi ? "translateX(16px)" : "translateX(0)", transition: "transform .2s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
                              </button>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.border}` }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: C.textSecondary }}>{t.useImageOptions}</span>
                              <button onClick={() => toggleMcqImageMode(qi)} style={{ width: 38, height: 22, borderRadius: 11, padding: 2, background: imageMode ? C.accent : C.border, border: "none", display: "flex", alignItems: "center", cursor: "pointer" }}>
                                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", transform: imageMode ? "translateX(16px)" : "translateX(0)", transition: "transform .2s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            {q.options.map((o, oi) => {
                              const correct = isMcqCorrect(q, oi);
                              const optText = typeof o === "string" ? o : (o?.text || "");
                              const optImg  = typeof o === "object" ? o?.image_url : null;
                              const uploadingThis = optionUploading[`${qi}:${oi}`];

                              if (imageMode) {
                                return (
                                  <div key={oi} style={{
                                    position: "relative",
                                    borderRadius: 10,
                                    overflow: "hidden",
                                    border: `2px solid ${correct ? C.green : C.border}`,
                                    background: optImg ? "#000" : C.bg,
                                  }}>
                                    {optImg ? (
                                      <div style={{
                                        width: "100%", aspectRatio: "1 / 1",
                                        backgroundImage: `url(${optImg})`,
                                        backgroundSize: "cover", backgroundPosition: "center",
                                      }} />
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => triggerOptionUpload(qi, oi)}
                                        disabled={uploadingThis}
                                        style={{
                                          width: "100%", aspectRatio: "1 / 1",
                                          background: C.bgSoft, border: "none",
                                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                                          color: C.textMuted, fontSize: 11, fontWeight: 600,
                                          cursor: uploadingThis ? "default" : "pointer",
                                          fontFamily: "'Outfit',sans-serif",
                                        }}
                                      >
                                        <CIcon name="art" size={24} />
                                        {uploadingThis ? t.uploading : `${t.uploadOptionImage} ${oi + 1}`}
                                      </button>
                                    )}

                                    {/* Optional caption (always editable in image mode) */}
                                    <input
                                      className="dk-input"
                                      value={optText}
                                      onChange={e => updateOption(qi, oi, { ...(typeof o === "object" ? o : {}), text: e.target.value, image_url: optImg })}
                                      placeholder={`Caption ${oi + 1} (optional)`}
                                      style={{ ...inp, fontSize: 12, padding: "6px 10px", borderRadius: 0, border: "none", borderTop: `1px solid ${C.border}` }}
                                    />

                                    {/* Action buttons over image */}
                                    <div style={{ position: "absolute", top: 6, left: 6, display: "flex", gap: 4 }}>
                                      <button
                                        type="button"
                                        onClick={() => toggleMcqCorrect(qi, oi)}
                                        title={correct ? t.correctAnswer : ""}
                                        style={{
                                          width: 24, height: 24,
                                          borderRadius: q.multi ? 6 : "50%",
                                          border: `2px solid ${correct ? C.green : "rgba(255,255,255,0.7)"}`,
                                          background: correct ? C.green : "rgba(0,0,0,0.4)",
                                          color: "#fff", fontSize: 11, cursor: "pointer", padding: 0,
                                          display: "flex", alignItems: "center", justifyContent: "center",
                                        }}
                                      >{correct && "✓"}</button>
                                    </div>
                                    <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
                                      {optImg && (
                                        <button
                                          type="button"
                                          onClick={() => triggerOptionUpload(qi, oi)}
                                          title={t.changeOptionImage}
                                          style={iconOverImageBtn}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C14.7614 3 17.2614 4.13579 19.0711 6.04822" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16 4L19 7L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        </button>
                                      )}
                                      {optImg && (
                                        <button
                                          type="button"
                                          onClick={() => removeOptionImage(qi, oi)}
                                          title={t.removeOptionImage}
                                          style={iconOverImageBtn}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                        </button>
                                      )}
                                      {q.options.length > 2 && (
                                        <button
                                          type="button"
                                          onClick={() => removeOption(qi, oi)}
                                          title={t.removeOption}
                                          style={iconOverImageBtn}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6H21M8 6V4C8 3.4 8.4 3 9 3H15C15.6 3 16 3.4 16 4V6M19 6L18 20C18 20.6 17.6 21 17 21H7C6.4 21 6 20.6 6 20L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              // ── Text mode ──
                              return (
                                <div key={oi} style={{ position: "relative" }}>
                                  <input
                                    className="dk-input"
                                    value={optText}
                                    onChange={e => updateOption(qi, oi, e.target.value)}
                                    placeholder={`${t.option} ${oi + 1}`}
                                    style={{ ...inp, paddingLeft: 36, paddingRight: q.options.length > 2 ? 36 : 14, background: correct ? C.greenSoft : C.bg, borderColor: correct ? C.green + "44" : C.border }}
                                  />
                                  <button
                                    onClick={() => toggleMcqCorrect(qi, oi)}
                                    title={correct ? t.correctAnswer : ""}
                                    style={{
                                      position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                                      width: 20, height: 20,
                                      borderRadius: q.multi ? 5 : "50%",
                                      border: `2px solid ${correct ? C.green : C.border}`,
                                      background: correct ? C.green : "transparent",
                                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                      fontSize: 10, color: "#fff", padding: 0,
                                    }}
                                  >{correct && "✓"}</button>
                                  {q.options.length > 2 && (
                                    <button
                                      onClick={() => removeOption(qi, oi)}
                                      title={t.removeOption}
                                      aria-label={t.removeOption}
                                      style={{
                                        position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                                        width: 24, height: 24, borderRadius: 6,
                                        background: "transparent", color: C.textMuted, border: "none",
                                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                        padding: 0,
                                      }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {q.options.length < MAX_OPTIONS && (
                            <button onClick={() => addOption(qi)} className="dk-add-mini" style={addMiniBtn}>
                              <CIcon name="plus" size={12} inline /> {t.addOption}
                            </button>
                          )}
                        </div>
                        );
                      })()}

                      {/* True/False */}
                      {(q.type === "tf" || (!q.type && activityType === "tf")) && (
                        <div style={{ display: "flex", gap: 6 }}>
                          {[true, false].map(v => (
                            <button key={String(v)} className="dk-pill" onClick={() => updateQ(qi, "correct", v)} style={{
                              flex: 1, padding: "10px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                              background: q.correct === v ? C.greenSoft : C.bg,
                              color: q.correct === v ? C.green : C.textMuted,
                              border: `1px solid ${q.correct === v ? C.green + "44" : C.border}`,
                              cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                            }}>{v ? "True" : "False"}</button>
                          ))}
                        </div>
                      )}

                      {/* Fill */}
                      {(q.type === "fill" || (!q.type && activityType === "fill")) && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <input className="dk-input" value={q.answer || ""} onChange={e => updateQ(qi, "answer", e.target.value)} placeholder={t.correctAnswer} style={{ ...inp, background: C.greenSoft, borderColor: C.green + "44" }} />
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.acceptedAlts}</label>
                            <input
                              className="dk-input"
                              value={Array.isArray(q.alternatives) ? q.alternatives.join(", ") : ""}
                              onChange={e => updateQ(qi, "alternatives", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                              placeholder="paris, PARIS, parís"
                              style={{ ...inp, fontSize: 13 }}
                            />
                            <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4, margin: 0 }}>{t.acceptedAltsHint}</p>
                          </div>
                        </div>
                      )}

                      {/* Order */}
                      {(q.type === "order" || (!q.type && activityType === "order")) && q.items && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {q.items.map((it, ii) => (
                            <div key={ii} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 22, height: 22, borderRadius: 5, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{ii + 1}</span>
                              <input className="dk-input" value={it} onChange={e => updateItem(qi, ii, e.target.value)} placeholder={`Step ${ii + 1}`} style={inp} />
                              {q.items.length > 2 && (
                                <button onClick={() => removeItem(qi, ii)} title={t.removeOption} style={miniDeleteBtn}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                              )}
                            </div>
                          ))}
                          {q.items.length < MAX_ITEMS && (
                            <button onClick={() => addItem(qi)} className="dk-add-mini" style={{ ...addMiniBtn, alignSelf: "flex-start" }}>
                              <CIcon name="plus" size={12} inline /> {t.addItem}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Match */}
                      {(q.type === "match" || (!q.type && activityType === "match")) && q.pairs && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {q.pairs.map((p, pi) => (
                            <div key={pi} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <input className="dk-input" value={p.left} onChange={e => updatePair(qi, pi, "left", e.target.value)} placeholder="Left" style={{ ...inp, fontFamily: MONO, fontWeight: 600 }} />
                              <span style={{ color: C.textMuted }}>→</span>
                              <input className="dk-input" value={p.right} onChange={e => updatePair(qi, pi, "right", e.target.value)} placeholder="Right" style={inp} />
                              {q.pairs.length > 2 && (
                                <button onClick={() => removePair(qi, pi)} title={t.removeOption} style={miniDeleteBtn}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                              )}
                            </div>
                          ))}
                          {q.pairs.length < MAX_PAIRS && (
                            <button onClick={() => addPair(qi)} className="dk-add-mini" style={{ ...addMiniBtn, alignSelf: "flex-start" }}>
                              <CIcon name="plus" size={12} inline /> {t.addPair}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Free Text */}
                      {(q.type === "free") && (
                        <div style={{ padding: "12px 14px", borderRadius: 8, background: C.bg, border: `1px dashed ${C.border}`, fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 8 }}>
                          <CIcon name="study" size={14} inline />
                          {t.freeTextHint}
                        </div>
                      )}

                      {/* Sentence Builder */}
                      {(q.type === "sentence") && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.requiredWord} *</label>
                            <input
                              className="dk-input"
                              value={q.required_word || ""}
                              onChange={e => updateQ(qi, "required_word", e.target.value)}
                              placeholder={t.requiredWordPlaceholder}
                              style={{ ...inp, fontFamily: MONO, fontWeight: 600, background: C.accentSoft, borderColor: C.accent + "44" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.minWords}</label>
                            <input
                              className="dk-input"
                              type="number"
                              min={1}
                              max={50}
                              value={q.min_words ?? 3}
                              onChange={e => updateQ(qi, "min_words", Math.max(1, parseInt(e.target.value || "1", 10)))}
                              style={{ ...inp, width: 100 }}
                            />
                          </div>
                          <div style={{ padding: "10px 12px", borderRadius: 8, background: C.bg, border: `1px dashed ${C.border}`, fontSize: 11, color: C.textMuted }}>
                            <CIcon name="lightbulb" size={12} inline /> {t.minWordsHint}
                          </div>
                        </div>
                      )}

                      {/* Slider */}
                      {(q.type === "slider") && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.sliderMin}</label>
                              <input
                                className="dk-input"
                                type="number"
                                value={q.min ?? 0}
                                onChange={e => updateQ(qi, "min", Number(e.target.value))}
                                style={{ ...inp, fontFamily: MONO }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.sliderMax}</label>
                              <input
                                className="dk-input"
                                type="number"
                                value={q.max ?? 100}
                                onChange={e => updateQ(qi, "max", Number(e.target.value))}
                                style={{ ...inp, fontFamily: MONO }}
                              />
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.sliderCorrect} *</label>
                              <input
                                className="dk-input"
                                type="number"
                                value={q.correct ?? 50}
                                onChange={e => updateQ(qi, "correct", Number(e.target.value))}
                                style={{ ...inp, fontFamily: MONO, background: C.greenSoft, borderColor: C.green + "44" }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.sliderTolerance}</label>
                              <input
                                className="dk-input"
                                type="number"
                                min={0}
                                value={q.tolerance ?? 5}
                                onChange={e => updateQ(qi, "tolerance", Math.max(0, Number(e.target.value)))}
                                style={{ ...inp, fontFamily: MONO }}
                              />
                            </div>
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSecondary, marginBottom: 4 }}>{t.sliderUnit}</label>
                            <input
                              className="dk-input"
                              value={q.unit || ""}
                              onChange={e => updateQ(qi, "unit", e.target.value)}
                              placeholder={t.sliderUnitPlaceholder}
                              style={{ ...inp, width: 200, fontSize: 13 }}
                            />
                          </div>
                          <div style={{ padding: "10px 12px", borderRadius: 8, background: C.bg, border: `1px dashed ${C.border}`, fontSize: 11, color: C.textMuted }}>
                            <CIcon name="lightbulb" size={12} inline /> {t.sliderHint}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Type Selector — appears below the list when triggered */}
        {showTypeSelector && (
          <div ref={typeSelectorRef} className="fade-up dk-type-picker" style={{
            marginTop: questions.length > 0 ? 12 : 0,
            padding: 18,
            borderRadius: 12,
            background: C.bg,
            border: `2px solid ${C.accent}`,
            boxShadow: `0 6px 20px ${C.accent}22`,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: C.text }}>{t.chooseType}</h4>
              <button
                className="dk-btn-secondary"
                onClick={() => setShowTypeSelector(false)}
                style={{
                  padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: "transparent", color: C.textMuted, border: "none",
                  cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                }}
              >{t.cancel}</button>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 8,
            }}>
              {ACTIVITY_TYPES.map(at => (
                <button
                  key={at.id}
                  className="dk-type-card"
                  onClick={() => addQuestion(at.id)}
                  style={{
                    padding: "16px 10px",
                    borderRadius: 10,
                    background: C.bg,
                    border: `1.5px solid ${C.border}`,
                    cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    transition: "all .15s ease",
                    minHeight: 80,
                  }}
                >
                  <CIcon name={at.icon} size={28} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text, textAlign: "center", lineHeight: 1.2 }}>{at.label[l]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add another button at the bottom — opens selector */}
        {questions.length > 0 && !showTypeSelector && (
          <button
            className="dk-add-another"
            onClick={openTypeSelector}
            style={{
              width: "100%",
              marginTop: 12,
              padding: "14px 16px",
              borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              background: C.bg, color: C.accent,
              border: `1.5px dashed ${C.accent}66`,
              cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all .15s ease",
            }}
          >
            <CIcon name="plus" size={16} inline /> {t.addAnother}
          </button>
        )}

        {/* Empty state — full friendly call to action */}
        {questions.length === 0 && !showTypeSelector && (
          <div style={{ textAlign: "center", padding: 36, background: C.bgSoft, borderRadius: 12, border: `1px dashed ${C.border}` }}>
            <CIcon name="question" size={32} />
            <p style={{ fontSize: 13, color: C.textMuted, marginTop: 10, marginBottom: 14 }}>{t.questionsEmpty}</p>
            <button
              className="dk-btn"
              onClick={openTypeSelector}
              style={{
                padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff",
              }}
            >{t.addQuestion}</button>
          </div>
        )}
      </div>
      )}

      {/* Save */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button className="dk-btn" onClick={handleSave} disabled={!canSave || saving} style={{
          flex: 1, padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600,
          background: canSave ? `linear-gradient(135deg, ${C.accent}, ${C.purple})` : C.border,
          color: "#fff", opacity: canSave && !saving ? 1 : 0.4,
        }}>{saving ? t.publishing : t.publish}</button>
      </div>

      {/* Ghost element following the pointer during drag (visual clone) */}
      {ghostState && (
        <div
          className="dk-q-ghost"
          style={{
            left: ghostState.x,
            top: ghostState.y,
            width: ghostState.width,
          }}
          dangerouslySetInnerHTML={{ __html: ghostState.html }}
        />
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────
export default function Decks({ lang: pageLang = "en", setLang: pageSetLang, onNavigateToSessions, decksOpts, onConsumeDecksOpts, onOpenMobileMenu }) {
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  const [view, setView] = useState("list"); // list | create | edit
  const [tab, setTab] = useState("myDecks"); // myDecks | following | favorites
  const [myDecks, setMyDecks] = useState([]);
  const [favoriteDecks, setFavoriteDecks] = useState([]);
  // "Following" = a merged feed of (a) decks the teacher copied from others
  // (own decks with copied_from_id set) and (b) decks they favorited from
  // community/profiles. Each item carries a `_kind` flag of "copy" or "fav"
  // so the card can show the right badge.
  const [followingDecks, setFollowingDecks] = useState([]);
  const [userId, setUserId] = useState(null);
  const [userClasses, setUserClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  // When the teacher clicks "+ Create deck" inside an empty class group, we
  // remember which class so the editor can pre-fill it.
  const [createForClassId, setCreateForClassId] = useState(null);
  // Organization controls
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState(""); // "" = all
  const [filterClass, setFilterClass] = useState("");     // "" = all
  const [groupBy, setGroupBy] = useState("class");        // class | subject | none
  const [expandedGroups, setExpandedGroups] = useState({}); // { groupKey: true } — collapsed by default
  const t = i18n[l] || i18n.en;

  useEffect(() => { loadData(); }, []);

  // Cross-page navigation hint: when arriving from "Create class" in Sessions
  // we get a focusClassId so we can show the teacher exactly where their new
  // class lives. We switch to grouped-by-class and expand that class's group +
  // scroll to it — but we DON'T set filterClass, so all classes stay visible
  // (otherwise the screen would only show the new class and feel empty).
  useEffect(() => {
    if (!decksOpts?.focusClassId) return;
    const id = decksOpts.focusClassId;
    setTab("myDecks");
    setGroupBy("class");
    setExpandedGroups(prev => ({ ...prev, [id]: true }));
    if (onConsumeDecksOpts) onConsumeDecksOpts();
    // Scroll into view shortly after render
    setTimeout(() => {
      const el = document.querySelector(`[data-group-id="${id}"]`);
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decksOpts?.focusClassId]);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id);
    if (!user) { setLoading(false); return; }

    const { data: cls } = await supabase.from("classes").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false });
    setUserClasses(cls || []);

    // My decks: created by user (not from community)
    const { data: mine } = await supabase.from("decks").select("*, originals:copied_from_id(id, author_id, profiles(full_name))").eq("author_id", user.id).order("created_at", { ascending: false });
    setMyDecks(mine || []);

    // Favorites: decks the user (as teacher) saved from Community via saved_decks table.
    // Pull saved_decks rows + join the actual deck data + author profile for "by X" labels.
    const { data: savedRows } = await supabase
      .from("saved_decks")
      .select("deck_id, decks(*, profiles(full_name))")
      .eq("student_id", user.id); // table column is `student_id` but it works for any user
    const favs = (savedRows || []).map(r => r.decks).filter(Boolean);
    setFavoriteDecks(favs);

    // Following = copies (decks I made by copying from another teacher) + favorites,
    // merged into one list with a _kind discriminator. Sorted newest first by
    // saved_at for favs and created_at for copies.
    const copies = (mine || [])
      .filter(d => d.copied_from_id)
      .map(d => ({ ...d, _kind: "copy", _sortAt: d.created_at }));
    const favsWithKind = (favs || []).map(d => ({ ...d, _kind: "fav", _sortAt: d.created_at }));
    const merged = [...copies, ...favsWithKind].sort((a, b) => new Date(b._sortAt) - new Date(a._sortAt));
    setFollowingDecks(merged);

    setLoading(false);
  };

  // Toggle favorite (remove). For adding, the action happens in Community.
  const handleRemoveFavorite = async (deckId) => {
    if (!userId) return;
    await supabase.from("saved_decks").delete()
      .eq("student_id", userId).eq("deck_id", deckId);
    setFavoriteDecks(prev => prev.filter(d => d.id !== deckId));
    // Also drop it from the following feed (which mixes copies + favs).
    setFollowingDecks(prev => prev.filter(d => !(d._kind === "fav" && d.id === deckId)));
  };

  const handleDelete = async (deckId) => {
    if (!confirm(t.deleteConfirm)) return;
    await supabase.from("decks").delete().eq("id", deckId);
    setMyDecks(prev => prev.filter(d => d.id !== deckId));
    // If the deleted deck is a copy that lived in Following, drop it there too.
    setFollowingDecks(prev => prev.filter(d => !(d._kind === "copy" && d.id === deckId)));
  };

  const handleTogglePublic = async (deck) => {
    const newPublic = !deck.is_public;

    // Un-publishing is always allowed.
    if (!newPublic) {
      await supabase.from("decks").update({ is_public: false, is_adapted: false }).eq("id", deck.id);
      setMyDecks(prev => prev.map(d => d.id === deck.id ? { ...d, is_public: false, is_adapted: false } : d));
      return;
    }

    // Publishing — gate it if this is a copy of someone else's deck.
    let isAdapted = false;
    if (deck.copied_from_id) {
      const { data: original, error: origErr } = await supabase
        .from("decks")
        .select("questions")
        .eq("id", deck.copied_from_id)
        .maybeSingle();

      if (origErr) {
        console.error("Failed to load original for derivation check:", origErr);
        alert(t.publishBlockedLowEffort);
        return;
      }

      if (original) {
        const result = analyzeDerivation(original.questions, deck.questions);
        if (!result.canPublish) {
          alert(
            result.status === "identical"
              ? t.publishBlockedIdentical
              : t.publishBlockedLowEffort
          );
          return;
        }
        isAdapted = result.showAdaptedBadge;
      } else {
        // We have a copied_from_id but can't read the original (deleted, or
        // RLS blocking). Safe default: assume derivative.
        isAdapted = true;
      }
    }

    await supabase.from("decks").update({ is_public: true, is_adapted: isAdapted }).eq("id", deck.id);
    setMyDecks(prev => prev.map(d => d.id === deck.id ? { ...d, is_public: true, is_adapted: isAdapted } : d));
  };

  if (view === "create" || view === "edit") return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="book" lang={l} setLang={setLang} maxWidth={600} onOpenMobileMenu={onOpenMobileMenu} />
      <CreateDeckEditor t={t} l={l} onBack={() => { setView("list"); setEditing(null); setCreateForClassId(null); }} userId={userId} userClasses={userClasses} existingDeck={editing} prefilledClassId={createForClassId} onCreated={(d) => {
        if (editing) setMyDecks(prev => prev.map(dk => dk.id === d.id ? d : dk));
        else setMyDecks(prev => [d, ...prev]);
        setView("list"); setEditing(null); setCreateForClassId(null);
      }} />
    </div>
  );

  // ── Filtering and grouping logic ─────────────────────────────────────────
  const sourceDecks = tab === "myDecks" ? myDecks : tab === "following" ? followingDecks : favoriteDecks;

  // Apply search + filters
  const filteredDecks = sourceDecks.filter(d => {
    if (search) {
      const q = search.toLowerCase();
      const hay = [d.title, d.description, ...(d.tags || [])].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterSubject && d.subject !== filterSubject) return false;
    if (filterClass) {
      if (filterClass === "__unassigned__") {
        if (d.class_id) return false;
      } else {
        if (d.class_id !== filterClass) return false;
      }
    }
    return true;
  });

  // Build groups based on groupBy. Returns [{ key, label, decks }, ...]
  const buildGroups = () => {
    if (groupBy === "none") return [{ key: "all", label: null, decks: filteredDecks }];
    if (groupBy === "class") {
      const byClass = new Map();
      filteredDecks.forEach(d => {
        const key = d.class_id || "__unassigned__";
        if (!byClass.has(key)) byClass.set(key, []);
        byClass.get(key).push(d);
      });
      const result = [];
      // For "My Decks" we show every class the teacher owns — even empty ones —
      // so newly-created classes are visible immediately and a + CTA appears
      // inside, telling the teacher exactly where to add their first deck.
      // For "Favorites" / "Following", only show classes that actually have
      // matching decks (empty placeholder doesn't make sense for borrowed decks).
      const showEmptyClasses = tab === "myDecks";
      userClasses.forEach(c => {
        if (byClass.has(c.id)) {
          result.push({ key: c.id, label: c.name, sublabel: `${c.subject} · ${c.grade}`, icon: SUBJ_ICON[c.subject] || "book", decks: byClass.get(c.id), classObj: c });
        } else if (showEmptyClasses) {
          // Skip empty classes if a search/filter narrowed results — would be misleading
          // to show "0 decks" when really the empty state is from filtering.
          const isFiltered = !!search || !!filterSubject || (!!filterClass && filterClass !== c.id);
          if (!isFiltered) {
            result.push({ key: c.id, label: c.name, sublabel: `${c.subject} · ${c.grade}`, icon: SUBJ_ICON[c.subject] || "book", decks: [], classObj: c, isEmpty: true });
          }
        }
      });
      if (byClass.has("__unassigned__")) {
        result.push({ key: "__unassigned__", label: t.filterUnassigned, sublabel: null, icon: "other", decks: byClass.get("__unassigned__") });
      }
      // Favorites tab: decks belong to OTHER teachers' classes — those won't match userClasses.
      // Push any leftover class_ids as "Other" buckets keyed by class_id.
      byClass.forEach((decks, key) => {
        if (key === "__unassigned__") return;
        if (!userClasses.find(c => c.id === key)) {
          result.push({ key: `other-${key}`, label: null, sublabel: null, icon: "other", decks });
        }
      });
      // Merge any "other" leftovers into a single bucket if multiple
      const others = result.filter(g => g.key.startsWith("other-"));
      if (others.length > 0) {
        const mergedDecks = others.flatMap(g => g.decks);
        const filtered = result.filter(g => !g.key.startsWith("other-"));
        filtered.push({ key: "other", label: t.filterUnassigned, sublabel: null, icon: "other", decks: mergedDecks });
        return filtered;
      }
      return result;
    }
    if (groupBy === "subject") {
      const bySubject = new Map();
      filteredDecks.forEach(d => {
        const key = d.subject || "Other";
        if (!bySubject.has(key)) bySubject.set(key, []);
        bySubject.get(key).push(d);
      });
      return Array.from(bySubject.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([subj, decks]) => ({
        key: subj, label: subj, sublabel: null, icon: SUBJ_ICON[subj] || "book", decks
      }));
    }
    return [];
  };
  const groups = buildGroups();

  const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Reusable deck row renderer ───────────────────────────────────────────
  // opts: { isFav } — true when rendering a favorite (read-only deck owned by
  // someone else). Copies (decks I made by copying from another teacher) are
  // editable like any other "my deck" — we just show a small "from X" pill.
  const renderDeckRow = (dk, i, opts = {}) => {
    const qs = dk.questions || [];
    const cls = userClasses.find(c => c.id === dk.class_id);
    const accent = resolveColor(dk);
    const isFav = opts.isFav;
    const isCopy = !isFav && !!dk.copied_from_id;
    // For "Following" tab, dk._kind is set; we use it to pick the right badge.
    const kindBadge = dk._kind === "fav" ? "fav" : dk._kind === "copy" ? "copy" : null;
    // Original author name. For copies, we joined `originals(profiles(full_name))`.
    // For favorites, the deck row already has profiles(full_name).
    const originalAuthor = isCopy ? dk.originals?.profiles?.full_name : (isFav ? dk.profiles?.full_name : null);
    return (
      <div key={dk.id} className="dk-card fade-up" style={{
        background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${accent}`,
        padding: 14, paddingLeft: 14,
        animationDelay: `${i * .04}s`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <DeckCover deck={dk} size={52} radius={10} />
          <div style={{ flex: 1, cursor: isFav ? "default" : "pointer", minWidth: 0 }} onClick={isFav ? undefined : () => { setEditing(dk); setView("edit"); }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dk.title}</span>
              {kindBadge === "fav" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600, background: C.accentSoft, color: C.accent, border: `1px solid ${C.accent}33` }}>
                  ★ {t.badgeFav}
                </span>
              )}
              {kindBadge === "copy" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600, background: C.purpleSoft, color: C.purple, border: `1px solid ${C.purple}33` }}>
                  ⧉ {t.badgeCopy}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              {dk.subject} · {dk.grade} · {qs.length} {t.questionCount}
              {cls && <> · <strong style={{ color: C.accent }}>{cls.name}</strong></>}
              {originalAuthor && <> · {t.fromTeacher} <strong>{originalAuthor}</strong></>}
              {" · "}<LangBadge lang={dk.language} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {isFav ? (
              <button className="dk-btn-danger" onClick={() => handleRemoveFavorite(dk.id)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }} title={t.favoriteRemove}>★ {t.favoriteRemove}</button>
            ) : (
              <>
                <button className="dk-btn-secondary" onClick={() => handleTogglePublic(dk)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: C.bgSoft, color: dk.is_public ? C.green : C.textMuted, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{dk.is_public ? t.public : t.private}</button>
                <button className="dk-btn-secondary" onClick={() => { setEditing(dk); setView("edit"); }} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.edit}</button>
                <button className="dk-btn-danger" onClick={() => handleDelete(dk.id)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: C.bg, color: C.red, border: `1px solid ${C.redSoft}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.delete}</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Subject options for filter (collected from decks themselves so we don't show empty subjects)
  const allSubjects = Array.from(new Set(sourceDecks.map(d => d.subject).filter(Boolean))).sort();

  return (
    <div style={{ padding: "28px 20px" }}>
      <style>{css}</style>
      <PageHeader title={t.pageTitle} icon="book" lang={l} setLang={setLang} onOpenMobileMenu={onOpenMobileMenu} />

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 20 }}>{t.subtitle}</p>

        {/* Tabs + Create button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[["myDecks", t.myDecks, myDecks.length], ["following", t.following, followingDecks.length], ["favorites", t.favorites, favoriteDecks.length]].map(([id, label, count]) => (
              <button key={id} className="dk-tab" onClick={() => setTab(id)} style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: tab === id ? C.accentSoft : C.bg,
                color: tab === id ? C.accent : C.textSecondary,
                border: `1px solid ${tab === id ? C.accent + "33" : C.border}`,
                display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
              }}>{label} {count > 0 && <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 8, background: tab === id ? C.accent : C.bgSoft, color: tab === id ? "#fff" : C.textMuted, fontWeight: 700 }}>{count}</span>}</button>
            ))}
          </div>
          {tab === "myDecks" && (
            <button className="dk-btn" onClick={() => setView("create")} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, color: "#fff", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.create}</button>
          )}
        </div>

        {/* Search + Filters bar */}
        {sourceDecks.length > 0 && (
          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><CIcon name="target" size={14} inline /></span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.search}
                style={{ ...inp, paddingLeft: 38, width: "100%" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ ...sel, flex: 1, minWidth: 140 }}>
                <option value="">{t.filterAllSubjects}</option>
                {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {tab === "myDecks" && (
                <div style={{ flex: 1, minWidth: 140, display: "flex", gap: 4 }}>
                  {userClasses.length > 0 ? (
                    <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ ...sel, flex: 1, minWidth: 0 }}>
                      <option value="">{t.filterAllClasses}</option>
                      {userClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      <option value="__unassigned__">{t.filterUnassigned}</option>
                    </select>
                  ) : null}
                  <button
                    onClick={() => onNavigateToSessions && onNavigateToSessions({ openCreateClass: true })}
                    title={t.newClassHint}
                    style={{
                      padding: "10px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: C.bg, color: C.accent, border: `1px dashed ${C.accent}66`,
                      cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >{t.newClass}</button>
                </div>
              )}
              <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ ...sel, flex: 1, minWidth: 140 }}>
                <option value="class">{t.groupBy}: {t.groupByClass}</option>
                <option value="subject">{t.groupBy}: {t.groupBySubject}</option>
                <option value="none">{t.groupBy}: {t.groupByNone}</option>
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: "center", color: C.textMuted, padding: 40 }}>Loading...</p>
        ) : sourceDecks.length === 0 ? (
          <div className="fade-up" style={{ textAlign: "center", padding: 48 }}>
            <CIcon name={tab === "myDecks" ? "book" : tab === "following" ? "teacher" : "star"} size={36} />
            <p style={{ fontSize: 15, color: C.textMuted, marginTop: 12 }}>{tab === "myDecks" ? t.noDecks : tab === "following" ? t.noFollowing : t.noFavorites}</p>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="fade-up" style={{ textAlign: "center", padding: 32 }}>
            <p style={{ fontSize: 14, color: C.textMuted }}>No matches</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {groups.map(group => {
              const collapsed = !expandedGroups[group.key];
              // Tint header by the class's subject color (when grouped by class
              // and the group corresponds to a real class — even if empty), or
              // by the first deck's color, or fall back to the accent.
              const firstDeck = group.decks[0];
              const subjAccent = group.classObj ? (SUBJ_COLOR?.[group.classObj.subject] || C.accent) : null;
              const groupAccent = subjAccent || (firstDeck ? resolveColor(firstDeck) : C.accent);
              return (
                <div key={group.key} data-group-id={group.key}>
                  {group.label && (
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="dk-group-header"
                      style={{
                        width: "100%",
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px", marginBottom: 10,
                        background: groupAccent + "10",
                        border: `1px solid ${groupAccent}26`,
                        borderRadius: 10,
                        fontFamily: "'Outfit',sans-serif", textAlign: "left",
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: groupAccent,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: `0 1px 3px ${groupAccent}33`,
                      }}>
                        <CIcon name={group.icon} size={16} inline />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{group.label}</div>
                        {group.sublabel && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{group.sublabel}</div>}
                      </div>
                      <span style={{
                        fontSize: 11, color: groupAccent,
                        padding: "2px 9px", borderRadius: 10,
                        background: C.bg, border: `1px solid ${groupAccent}40`,
                        fontWeight: 700, flexShrink: 0,
                      }}>{group.decks.length}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .15s ease" }}>
                        <path d="M6 9l6 6 6-6" stroke={C.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                  {!collapsed && (
                    group.isEmpty ? (
                      // Empty class — minimal "+" tile that rotates on hover
                      <div style={{ marginLeft: group.label ? 8 : 0 }}>
                        <button
                          onClick={() => { setCreateForClassId(group.classObj.id); setView("create"); }}
                          className="dk-plus-tile"
                          aria-label={t.addDeckToClass}
                          title={t.addDeckToClass}
                          style={{
                            width: "100%",
                            padding: "32px 20px",
                            background: groupAccent + "08",
                            border: `1.5px dashed ${groupAccent}55`,
                            borderRadius: 12,
                            cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: groupAccent,
                            fontFamily: "'Outfit',sans-serif",
                            transition: "background .2s ease, border-color .2s ease",
                            "--accent": groupAccent,
                          }}
                        >
                          <span className="dk-plus-icon" style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 44, height: 44, borderRadius: "50%",
                            background: groupAccent + "1A",
                            transition: "transform .35s cubic-bezier(.4,1.6,.5,1), background .2s ease, box-shadow .2s ease",
                            fontSize: 26, fontWeight: 300, lineHeight: 1,
                          }}>+</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: group.label ? 8 : 0 }}>
                        {group.decks.map((dk, i) => renderDeckRow(dk, i, { isFav: tab === "favorites" || (tab === "following" && dk._kind === "fav") }))}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
