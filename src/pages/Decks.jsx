import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useMatch } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";
import { DeckCover, SUBJ_ICON, SUBJ_COLOR, resolveColor, colorTint, DECK_COLORS } from "../lib/deck-cover";
import { analyzeDerivation } from "../lib/deck-derivation";
import { useIsMobile } from "../components/MobileMenuButton";
import PageHeader from "../components/PageHeader";
import { MONO } from "../components/tokens";
import { C, css } from "./Decks/styles";
import CreateDeckEditor from "./Decks/CreateDeckEditor";
import { ROUTES, QUERY, buildRoute } from "../routes";

const SUBJECTS = ["Math", "Science", "History", "Language", "Geography", "Art", "Music", "Other"];
const GRADES = ["6th-7th", "7th-8th", "8th-9th", "9th-10th", "10th-11th", "11th-12th"];

// Input/select styling for the list-view filters. The editor has its own
// copy in CreateDeckEditor.jsx — we don't share to avoid coupling the two
// files through a tiny utility module.
const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };
const sel = { ...inp, cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32 };

const i18n = {
  en: {
    pageTitle: "Decks", subtitle: "Create and manage your question collections",
    myDecks: "My Decks", favorites: "Favorites", create: "+ Create deck",
    search: "Search decks...", filterAll: "All", filterSubject: "Subject", filterClass: "Class", filterAllSubjects: "All subjects", filterAllClasses: "All classes", filterUnassigned: "Unassigned",
    newClass: "+ New class", newClassHint: "You can create a new class from Sessions",
    groupBy: "Group by", groupByClass: "Class", groupBySubject: "Subject", groupByNone: "None",
    noFavorites: "No favorites yet. Save decks from Community to see them here.",
    badgeCopy: "Copy",
    fromTeacher: "from",
    emptyClassHint: "This class has no decks yet.",
    addDeckToClass: "Create deck for this class",
    favoriteRemove: "Remove from favorites", favoriteAdd: "Add to favorites",
    customizeFav: "Customize", customizeFavHint: "Make a copy you can edit and assign to a class",
    addToWhichFav: "Add to which class?", noClassFav: "No class — keep as personal deck",
    noClassesYetFav: "You don't have any classes yet. The copy will be saved without a class.",
    savedToMyDecks: "Saved to My Decks!",
    title: "Title", titlePlaceholder: "e.g. French Revolution Review",
    description: "Description", descPlaceholder: "What this deck covers...",
    addToClass: "Add to class (optional)", noClass: "No class — general deck",
    addingToClass: "Adding to",
    sectionLabel: "Section",
    sectionHelp: "Where this deck lives in the class.",
    sectionLockedHelp: "Pick a class first to choose a section.",
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
    estimatedTime: "Estimated session time",
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
    // ── AI generation panel ──
    aiGenerateButton: "Generate with AI",
    aiPanelTitle: "Generate questions with AI",
    aiSourceLabel: "Class material (PDF, image, slides, notes)",
    aiUploadCta: "Upload a file",
    aiUploadHint: "PDF, image, DOCX, PPTX, or text. Up to 10 MB. The AI will read it and write questions about it.",
    aiRemoveFile: "Remove file",
    aiFileTooBig: "File is too big — max {mb} MB.",
    aiTopicOptional: "Topic (optional, helps focus the AI)",
    aiTopicRequired: "Topic",
    aiTopicPlaceholder: "e.g. The water cycle, French Revolution causes",
    aiKeyPointsLabel: "Key points to cover (optional)",
    aiKeyPointsPlaceholder: "One per line — the concepts you want to test",
    aiTypeLabel: "Question type",
    aiTypeMixed: "Mixed (recommended)",
    aiCountLabel: "How many",
    aiContextLabel: "Section",
    aiContextHelp: "Set on the General tab. The AI matches its question style to this section.",
    aiContextWarmup: "Warmup (start of class)",
    aiContextExit: "Exit ticket (end of class)",
    aiContextGeneral: "General review",
    aiLanguageLabel: "Language",
    aiLanguagePlaceholder: "Select language",
    aiGenerateCta: "Generate",
    aiGenerating: "Generating...",
    aiNoQuestions: "The AI didn't return any questions. Try again or change the source material.",
    aiBadOutput: "The AI returned an unexpected format. Try generating again.",
    aiRateLimited: "You've reached your daily generation limit. Try again tomorrow.",
    aiSessionExpired: "Your session expired. Please refresh the page and sign in again.",
    aiTeachersOnly: "Only teachers can generate questions with AI.",
    aiExtractionEmpty: "We couldn't read enough text from this file. If it's mostly images, save it as PDF and try again — Claude reads PDFs natively.",
    aiExtractionFailed: "We couldn't open this file. It may be corrupted or password-protected.",
    aiUnsupportedFile: "Unsupported file type. Use PDF, image, DOCX, PPTX, or text.",
    aiFileTooBigGeneric: "File is too big. Use up to 3 MB for PDFs/images, 25 MB for DOCX/PPTX.",
    aiPromptTooLong: "The source material is too long for the AI to process. Try a shorter document or split it in parts.",
    aiDocLegacy: "Old .doc files (Word 97-2003) aren't supported. Open it in Word and save as .docx, then try again.",
    aiTruncatedMsg: "The source was very long ({total} chars). The AI used the first {used} chars only — review the questions to make sure key topics are covered.",
    aiValidationDropped: "Quality check filtered out {dropped} weaker question(s). {kept} delivered.",
    aiQualityFilteredSoft: "{delivered} of {requested} ready to use ({dropped} filtered for quality).",
    aiQualityFilteredHard: "Only {delivered} of {requested} passed the quality check. Try a richer source or a single question type.",
    aiError: "Something went wrong. Try again.",
    aiDroppedSomeMsg: "{kept} questions added · {dropped} skipped (incomplete)",
    aiAllDroppedMsg: "All {dropped} questions came back incomplete. Try generating again, change the source, or pick a single type.",
  },
  es: {
    pageTitle: "Decks", subtitle: "Crea y gestiona tus colecciones de preguntas",
    myDecks: "Mis Decks", favorites: "Favoritos", create: "+ Crear deck",
    search: "Buscar decks...", filterAll: "Todos", filterSubject: "Materia", filterClass: "Clase", filterAllSubjects: "Todas las materias", filterAllClasses: "Todas las clases", filterUnassigned: "Sin clase",
    newClass: "+ Nueva clase", newClassHint: "Puedes crear una clase nueva desde Sesiones",
    groupBy: "Agrupar por", groupByClass: "Clase", groupBySubject: "Materia", groupByNone: "Ninguno",
    noFavorites: "Aún no tienes favoritos. Guarda decks de la Comunidad para verlos aquí.",
    badgeCopy: "Copia",
    fromTeacher: "de",
    emptyClassHint: "Esta clase aún no tiene decks.",
    addDeckToClass: "Crear deck para esta clase",
    favoriteRemove: "Quitar de favoritos", favoriteAdd: "Agregar a favoritos",
    customizeFav: "Personalizar", customizeFavHint: "Crea una copia que puedes editar y asignar a una clase",
    addToWhichFav: "¿A qué clase agregarlo?", noClassFav: "Sin clase — mantener como deck personal",
    noClassesYetFav: "Aún no tienes clases. La copia se guardará sin clase.",
    savedToMyDecks: "¡Guardado en Mis Decks!",
    title: "Título", titlePlaceholder: "ej. Repaso Revolución Francesa",
    description: "Descripción", descPlaceholder: "Qué cubre este deck...",
    addToClass: "Agregar a clase (opcional)", noClass: "Sin clase — deck general",
    addingToClass: "Agregando a",
    sectionLabel: "Sección",
    sectionHelp: "Dónde vive este deck en la clase.",
    sectionLockedHelp: "Elige una clase primero para escoger sección.",
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
    estimatedTime: "Tiempo estimado de sesión",
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
    // ── AI generation panel ──
    aiGenerateButton: "Generar con AI",
    aiPanelTitle: "Generar preguntas con AI",
    aiSourceLabel: "Material de clase (PDF, imagen, slides, notas)",
    aiUploadCta: "Subir un archivo",
    aiUploadHint: "PDF, imagen, DOCX, PPTX o texto. Hasta 10 MB. La AI lo va a leer y escribir las preguntas a partir de él.",
    aiRemoveFile: "Quitar archivo",
    aiFileTooBig: "El archivo es muy grande — máximo {mb} MB.",
    aiTopicOptional: "Tema (opcional, ayuda a enfocar a la AI)",
    aiTopicRequired: "Tema",
    aiTopicPlaceholder: "ej. El ciclo del agua, causas de la Revolución Francesa",
    aiKeyPointsLabel: "Puntos clave a cubrir (opcional)",
    aiKeyPointsPlaceholder: "Uno por línea — los conceptos que quieres evaluar",
    aiTypeLabel: "Tipo de pregunta",
    aiTypeMixed: "Mixto (recomendado)",
    aiCountLabel: "Cuántas",
    aiContextLabel: "Sección",
    aiContextHelp: "Se elige en la pestaña General. La AI ajusta el estilo de las preguntas a esta sección.",
    aiContextWarmup: "Warmup (inicio de clase)",
    aiContextExit: "Exit ticket (fin de clase)",
    aiContextGeneral: "Repaso general",
    aiLanguageLabel: "Idioma",
    aiLanguagePlaceholder: "Selecciona idioma",
    aiGenerateCta: "Generar",
    aiGenerating: "Generando...",
    aiNoQuestions: "La AI no devolvió preguntas. Intenta de nuevo o cambia el material.",
    aiBadOutput: "La AI devolvió un formato inesperado. Intenta generar otra vez.",
    aiRateLimited: "Llegaste al límite diario de generaciones. Intenta mañana.",
    aiSessionExpired: "Tu sesión expiró. Recarga la página e inicia sesión de nuevo.",
    aiTeachersOnly: "Solo los profes pueden generar preguntas con AI.",
    aiExtractionEmpty: "No pudimos leer suficiente texto del archivo. Si tiene principalmente imágenes, guárdalo como PDF y vuelve a subirlo — Claude lee los PDFs nativamente.",
    aiExtractionFailed: "No pudimos abrir el archivo. Puede estar dañado o protegido con contraseña.",
    aiUnsupportedFile: "Tipo de archivo no soportado. Usa PDF, imagen, DOCX, PPTX o texto.",
    aiFileTooBigGeneric: "El archivo es muy grande. Usa hasta 3 MB para PDF/imágenes, 25 MB para DOCX/PPTX.",
    aiPromptTooLong: "El material es muy largo para la AI. Prueba con un documento más corto o divídelo en partes.",
    aiDocLegacy: "Los archivos .doc viejos (Word 97-2003) no se soportan. Ábrelo en Word y guárdalo como .docx, luego vuelve a intentarlo.",
    aiTruncatedMsg: "La fuente era muy larga ({total} caracteres). La AI usó solo los primeros {used} — revisa que las preguntas cubran lo importante.",
    aiValidationDropped: "El control de calidad filtró {dropped} pregunta(s) más débil(es). Quedaron {kept}.",
    aiQualityFilteredSoft: "{delivered} de {requested} listas para usar ({dropped} filtradas por calidad).",
    aiQualityFilteredHard: "Solo {delivered} de {requested} pasaron el control de calidad. Prueba con material más extenso o un solo tipo de pregunta.",
    aiError: "Algo salió mal. Intenta de nuevo.",
    aiDroppedSomeMsg: "{kept} preguntas agregadas · {dropped} descartadas (incompletas)",
    aiAllDroppedMsg: "Las {dropped} preguntas vinieron incompletas. Intenta generar de nuevo, cambia el material, o elige un solo tipo.",
  },
  ko: {
    pageTitle: "덱", subtitle: "문제 모음을 만들고 관리하세요",
    myDecks: "내 덱", favorites: "즐겨찾기", create: "+ 덱 만들기",
    search: "덱 검색...", filterAll: "전체", filterSubject: "과목", filterClass: "수업", filterAllSubjects: "모든 과목", filterAllClasses: "모든 수업", filterUnassigned: "미지정",
    newClass: "+ 새 수업", newClassHint: "세션에서 새 수업을 만들 수 있습니다",
    groupBy: "그룹화", groupByClass: "수업", groupBySubject: "과목", groupByNone: "없음",
    noFavorites: "아직 즐겨찾기가 없습니다. 커뮤니티에서 덱을 저장하여 여기에 표시하세요.",
    badgeCopy: "복사",
    fromTeacher: "—",
    emptyClassHint: "이 수업에는 아직 덱이 없습니다.",
    addDeckToClass: "이 수업을 위한 덱 만들기",
    favoriteRemove: "즐겨찾기에서 제거", favoriteAdd: "즐겨찾기에 추가",
    customizeFav: "커스터마이즈", customizeFavHint: "편집하고 수업에 배정할 수 있는 복사본 만들기",
    addToWhichFav: "어느 수업에 추가하시겠습니까?", noClassFav: "수업 없음 — 개인 덱으로 유지",
    noClassesYetFav: "아직 수업이 없습니다. 복사본이 수업 없이 저장됩니다.",
    savedToMyDecks: "내 덱에 저장되었습니다!",
    title: "제목", titlePlaceholder: "예: 프랑스 혁명 복습",
    description: "설명", descPlaceholder: "이 덱의 내용...",
    addToClass: "수업에 추가 (선택)", noClass: "수업 없음 — 일반 덱",
    addingToClass: "추가 대상",
    sectionLabel: "섹션",
    sectionHelp: "이 덱이 수업에서 위치할 곳입니다.",
    sectionLockedHelp: "먼저 수업을 선택하세요.",
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
    estimatedTime: "예상 세션 시간",
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
    // ── AI 생성 패널 ──
    aiGenerateButton: "AI로 생성",
    aiPanelTitle: "AI로 문제 생성",
    aiSourceLabel: "수업 자료 (PDF, 이미지, 슬라이드, 노트)",
    aiUploadCta: "파일 업로드",
    aiUploadHint: "PDF, 이미지, DOCX, PPTX, 텍스트. 최대 10 MB. AI가 자료를 읽고 문제를 작성합니다.",
    aiRemoveFile: "파일 제거",
    aiFileTooBig: "파일이 너무 큽니다 — 최대 {mb} MB.",
    aiTopicOptional: "주제 (선택, AI를 집중시키는 데 도움)",
    aiTopicRequired: "주제",
    aiTopicPlaceholder: "예: 물의 순환, 프랑스 혁명의 원인",
    aiKeyPointsLabel: "다룰 핵심 포인트 (선택)",
    aiKeyPointsPlaceholder: "한 줄에 하나씩 — 평가하고 싶은 개념",
    aiTypeLabel: "문제 유형",
    aiTypeMixed: "혼합형 (권장)",
    aiCountLabel: "몇 개",
    aiContextLabel: "섹션",
    aiContextHelp: "General 탭에서 설정합니다. AI가 이 섹션에 맞춰 문제 스타일을 조정합니다.",
    aiContextWarmup: "워밍업 (수업 시작)",
    aiContextExit: "종료 티켓 (수업 끝)",
    aiContextGeneral: "일반 복습",
    aiLanguageLabel: "언어",
    aiLanguagePlaceholder: "언어 선택",
    aiGenerateCta: "생성",
    aiGenerating: "생성 중...",
    aiNoQuestions: "AI가 문제를 반환하지 않았습니다. 다시 시도하거나 자료를 변경하세요.",
    aiBadOutput: "AI가 예상치 못한 형식을 반환했습니다. 다시 생성해 보세요.",
    aiRateLimited: "일일 생성 한도에 도달했습니다. 내일 다시 시도하세요.",
    aiSessionExpired: "세션이 만료되었습니다. 페이지를 새로고침하고 다시 로그인하세요.",
    aiTeachersOnly: "교사만 AI로 문제를 생성할 수 있습니다.",
    aiExtractionEmpty: "파일에서 충분한 텍스트를 읽을 수 없습니다. 주로 이미지로 구성되어 있다면 PDF로 저장 후 다시 업로드하세요 — Claude는 PDF를 기본적으로 읽습니다.",
    aiExtractionFailed: "파일을 열 수 없습니다. 손상되었거나 비밀번호로 보호되어 있을 수 있습니다.",
    aiUnsupportedFile: "지원되지 않는 파일 형식입니다. PDF, 이미지, DOCX, PPTX 또는 텍스트를 사용하세요.",
    aiFileTooBigGeneric: "파일이 너무 큽니다. PDF/이미지는 최대 3 MB, DOCX/PPTX는 최대 25 MB.",
    aiPromptTooLong: "자료가 AI가 처리하기에 너무 깁니다. 더 짧은 문서를 사용하거나 부분으로 나누세요.",
    aiDocLegacy: ".doc 구형 파일(Word 97-2003)은 지원되지 않습니다. Word에서 열어 .docx로 저장한 후 다시 시도하세요.",
    aiTruncatedMsg: "자료가 매우 길었습니다 ({total}자). AI는 처음 {used}자만 사용했습니다 — 핵심 내용이 다뤄졌는지 문제를 확인하세요.",
    aiValidationDropped: "품질 검사로 약한 문제 {dropped}개를 걸러냈습니다. {kept}개가 전달되었습니다.",
    aiQualityFilteredSoft: "{requested}개 중 {delivered}개 사용 준비 완료 ({dropped}개 품질로 걸러짐).",
    aiQualityFilteredHard: "{requested}개 중 {delivered}개만 품질 검사를 통과했습니다. 더 풍부한 자료를 사용하거나 단일 문제 유형을 선택해 보세요.",
    aiError: "문제가 발생했습니다. 다시 시도하세요.",
    aiDroppedSomeMsg: "{kept}개 추가됨 · {dropped}개 건너뜀 (불완전함)",
    aiAllDroppedMsg: "{dropped}개 문제가 모두 불완전했습니다. 다시 생성하거나, 자료를 변경하거나, 단일 유형을 선택하세요.",
  },
};


const LangBadge = ({ lang }) => {
  const l = { en: "EN", es: "ES", ko: "한" };
  const c = { en: C.accent, es: C.orange, ko: C.green };
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: (c[lang] || C.accent) + "14", color: c[lang] || C.accent }}>{l[lang] || lang}</span>;
};

// ─── Create Deck Editor ─────────────────────────────
// ─── Live preview of a deck card while editing ──────────────────────────────
export default function Decks({ lang: pageLang = "en", setLang: pageSetLang, onNavigateToSessions, onOpenMobileMenu }) {
  const isMobile = useIsMobile();
  const [lang, setLangLocal] = useState(pageLang);
  const setLang = pageSetLang || setLangLocal;
  const l = pageLang || lang;
  // Subview is derived from the URL:
  //   /decks                  → view="list"
  //   /decks/new              → view="create" (with optional ?class= for prefilled)
  //   /decks/:deckId/edit     → view="edit"
  // Browser back navigates between these naturally.
  const navigate = useNavigate();
  const editMatch = useMatch("/decks/:deckId/edit");
  const newMatch = useMatch("/decks/new");
  const editingId = editMatch?.params?.deckId || null;
  const view = editingId ? "edit" : (newMatch ? "create" : "list");
  const [tab, setTab] = useState("myDecks"); // myDecks | favorites
  const [myDecks, setMyDecks] = useState([]);
  const [favoriteDecks, setFavoriteDecks] = useState([]);
  const [userId, setUserId] = useState(null);
  const [userClasses, setUserClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  // The editing deck object. Derived from editingId + the loaded myDecks list.
  // This used to be standalone state; now it's a function of the URL + data.
  const editing = editingId ? (myDecks.find(d => d.id === editingId) || null) : null;
  // When the teacher clicks "+ Create deck" inside an empty class group, we
  // remember which class so the editor can pre-fill it. Read from ?class=
  // in URL when entering /decks/new (the same param has a different meaning
  // on /decks list — there it's the focus hint consumed by the effect below).
  // Favorite deck currently being customized (= copied to My Decks).
  // When set, we render a class-picker modal to choose the destination class.
  const [customizingFav, setCustomizingFav] = useState(null);
  // Organization controls
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState(""); // "" = all
  const [filterClass, setFilterClass] = useState("");     // "" = all
  const [groupBy, setGroupBy] = useState("class");        // class | subject | none
  const [expandedGroups, setExpandedGroups] = useState({}); // { groupKey: true } — collapsed by default
  const t = i18n[l] || i18n.en;

  useEffect(() => { loadData(); }, []);

  // Cross-page navigation hint via URL search param: ?class=<id>. When
  // arriving from "Create class" in Sessions we get a focusClassId so we can
  // show the teacher exactly where their new class lives. We switch to
  // grouped-by-class and expand that class's group + scroll to it — but we
  // DON'T set filterClass, so all classes stay visible (otherwise the screen
  // would only show the new class and feel empty). The param is consumed
  // once and removed from the URL with replace=true so refresh / back /
  // forward don't re-trigger the focus.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const id = searchParams.get(QUERY.CLASS);
    if (!id) return;
    setTab("myDecks");
    setGroupBy("class");
    setExpandedGroups(prev => ({ ...prev, [id]: true }));
    // Strip the param so it doesn't keep firing this effect.
    const next = new URLSearchParams(searchParams);
    next.delete(QUERY.CLASS);
    setSearchParams(next, { replace: true });
    // Scroll into view shortly after render
    setTimeout(() => {
      const el = document.querySelector(`[data-group-id="${id}"]`);
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get(QUERY.CLASS)]);

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

    setLoading(false);
  };

  // Toggle favorite (remove). For adding, the action happens in Community.
  const handleRemoveFavorite = async (deckId) => {
    if (!userId) return;
    await supabase.from("saved_decks").delete()
      .eq("student_id", userId).eq("deck_id", deckId);
    setFavoriteDecks(prev => prev.filter(d => d.id !== deckId));
  };

  // "Customize" a favorite — INSERT a personal copy into `decks` with
  // copied_from_id pointing back to the original. The favorite stays in
  // saved_decks so the user can keep it as inspiration if they want.
  // Mirrors the same flow Community uses, but launched from the Favorites tab.
  const handleCustomizeFavorite = async (deck, classId) => {
    if (!userId) return;
    const cls = classId ? userClasses.find(c => c.id === classId) : null;
    const { data: inserted, error } = await supabase.from("decks").insert({
      author_id: userId, class_id: classId || null,
      title: deck.title, description: deck.description,
      subject: cls?.subject || deck.subject, grade: cls?.grade || deck.grade,
      language: deck.language, questions: deck.questions, tags: deck.tags, is_public: false,
      cover_color: deck.cover_color, cover_icon: deck.cover_icon, cover_image_url: deck.cover_image_url,
      copied_from_id: deck.id,
    }).select().single();
    if (error) {
      console.error("customize favorite failed", error);
      return;
    }
    // Bump uses_count on the original (same behavior as Community's save flow)
    await supabase.from("decks").update({ uses_count: (deck.uses_count || 0) + 1 }).eq("id", deck.id);
    // Add the new copy to MyDecks state so the user sees it in My Decks
    // immediately without a refetch.
    setMyDecks(prev => [inserted, ...prev]);
    setCustomizingFav(null);
    setTab("myDecks"); // bounce them into My Decks where their copy lives now
    // Open the editor on the fresh copy so they can immediately personalize it.
    // The view derives from the URL, so navigating is enough — `editing` will
    // be re-derived from myDecks by the find() above.
    navigate(buildRoute.deckEdit(inserted.id));
  };

  const handleDelete = async (deckId) => {
    if (!confirm(t.deleteConfirm)) return;
    await supabase.from("decks").delete().eq("id", deckId);
    setMyDecks(prev => prev.filter(d => d.id !== deckId));
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

  if (view === "create" || view === "edit") {
    // ?class= on /decks/new pre-fills the class in the editor (e.g. clicking
    // "+ Create deck" inside an empty class group). On /decks/:id/edit the
    // existing deck's class wins, so we ignore the param.
    const prefilledClassId = view === "create" ? (searchParams.get(QUERY.CLASS) || null) : null;
    // ?section= on /decks/new pre-fills the deck's section, used when the
    // teacher clicks "+ New warmup" / "+ New exit ticket" / "+ New review"
    // from inside ClassPage. On edit, existing deck's section wins.
    const prefilledSection = view === "create" ? (searchParams.get("section") || null) : null;

    // Edge case: deep-link refresh on /decks/:id/edit before myDecks finished
    // loading. Show the page-level loader and let the next render resolve
    // `editing` from the loaded list.
    if (view === "edit" && loading) {
      return (
        <div style={{ padding: "28px 20px" }}>
          <style>{css}</style>
          <PageHeader title={t.pageTitle} icon="book" lang={l} setLang={setLang} maxWidth={600} onOpenMobileMenu={onOpenMobileMenu} />
          <div style={{ maxWidth: 600, margin: "0 auto", padding: 40, textAlign: "center", color: C.textMuted, fontFamily: "'Outfit',sans-serif" }}>{t.loading || "Loading…"}</div>
        </div>
      );
    }
    // Same race-condition guard for create: if we land on /decks/new?class=<id>
    // before userClasses has loaded, the editor would mount with an empty
    // userClasses array and not be able to resolve the class for prefill.
    // Wait for the load to finish before instantiating the editor.
    if (view === "create" && loading && prefilledClassId) {
      return (
        <div style={{ padding: "28px 20px" }}>
          <style>{css}</style>
          <PageHeader title={t.pageTitle} icon="book" lang={l} setLang={setLang} maxWidth={600} onOpenMobileMenu={onOpenMobileMenu} />
          <div style={{ maxWidth: 600, margin: "0 auto", padding: 40, textAlign: "center", color: C.textMuted, fontFamily: "'Outfit',sans-serif" }}>{t.loading || "Loading…"}</div>
        </div>
      );
    }
    // Edge case: edit URL points to a deck that doesn't belong to this user
    // or has been deleted. Bounce back to the list.
    if (view === "edit" && !loading && !editing) {
      navigate(ROUTES.DECKS, { replace: true });
      return null;
    }

    return (
      <div style={{ padding: "28px 20px" }}>
        <style>{css}</style>
        <PageHeader title={t.pageTitle} icon="book" lang={l} setLang={setLang} maxWidth={600} onOpenMobileMenu={onOpenMobileMenu} />
        <CreateDeckEditor
          t={t} l={l}
          onBack={() => navigate(ROUTES.DECKS)}
          userId={userId}
          userClasses={userClasses}
          existingDeck={editing}
          prefilledClassId={prefilledClassId}
          prefilledSection={prefilledSection}
          onCreated={(d) => {
            if (editing) setMyDecks(prev => prev.map(dk => dk.id === d.id ? d : dk));
            else setMyDecks(prev => [d, ...prev]);
            navigate(ROUTES.DECKS);
          }}
        />
      </div>
    );
  }

  // ── Filtering and grouping logic ─────────────────────────────────────────
  const sourceDecks = tab === "myDecks" ? myDecks : favoriteDecks;

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
      // For "Favorites", only show classes that actually have matching decks
      // (empty placeholder doesn't make sense for borrowed decks).
      const showEmptyClasses = tab === "myDecks";
      userClasses.forEach(c => {
        // Sublabel includes the class code so the teacher can dictate it to
        // students directly from this page (My Classes is the canonical home,
        // but Decks is where the teacher spends most of their time).
        const subl = `${c.subject} · ${c.grade}${c.class_code ? ` · ${c.class_code}` : ""}`;
        if (byClass.has(c.id)) {
          result.push({ key: c.id, label: c.name, sublabel: subl, icon: SUBJ_ICON[c.subject] || "book", decks: byClass.get(c.id), classObj: c });
        } else if (showEmptyClasses) {
          // Skip empty classes if a search/filter narrowed results — would be misleading
          // to show "0 decks" when really the empty state is from filtering.
          const isFiltered = !!search || !!filterSubject || (!!filterClass && filterClass !== c.id);
          if (!isFiltered) {
            result.push({ key: c.id, label: c.name, sublabel: subl, icon: SUBJ_ICON[c.subject] || "book", decks: [], classObj: c, isEmpty: true });
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
    // Original author name. For copies (deck in MyDecks copied from someone),
    // we joined `originals(profiles(full_name))`. For favorites, the deck row
    // already has profiles(full_name).
    const originalAuthor = isCopy ? dk.originals?.profiles?.full_name : (isFav ? dk.profiles?.full_name : null);
    return (
      <div
        key={dk.id}
        className="dk-card fade-up"
        onClick={isFav ? () => setCustomizingFav(dk) : undefined}
        style={{
          background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`,
          borderLeft: `4px solid ${accent}`,
          padding: 14, paddingLeft: 14,
          animationDelay: `${i * .04}s`,
        }}
      >
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          gap: isMobile ? 10 : 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            <DeckCover deck={dk} size={52} radius={10} />
            <div
              style={{ flex: 1, cursor: "pointer", minWidth: 0 }}
              onClick={isFav ? undefined : () => navigate(buildRoute.deckEdit(dk.id))}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dk.title}</span>
                {isCopy && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600, background: C.purpleSoft, color: C.purple, border: `1px solid ${C.purple}` }}>
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
          </div>
          <div style={{
            display: "flex",
            gap: 6,
            justifyContent: isMobile ? "flex-end" : "flex-start",
            flexShrink: 0,
            flexWrap: "wrap",
          }}>
            {isFav ? (
              <>
                <button
                  className="dk-fav-customize"
                  onClick={(e) => { e.stopPropagation(); setCustomizingFav(dk); }}
                  style={{
                    padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: C.accentSoft, color: C.accent,
                    border: `1px solid ${C.accent}33`, cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif",
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                  title={t.customizeFavHint}
                >
                  <CIcon name="sparkle" size={12} inline /> {t.customizeFav}
                </button>
                <button
                  className="dk-fav-remove"
                  onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(dk.id); }}
                  style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: C.bg, color: C.textMuted,
                    border: `1px solid ${C.border}`, cursor: "pointer",
                    fontSize: 14, lineHeight: 1,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Outfit',sans-serif",
                  }}
                  title={t.favoriteRemove}
                >×</button>
              </>
            ) : (
              <>
                <button className="dk-btn-secondary" onClick={() => handleTogglePublic(dk)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: C.bgSoft, color: dk.is_public ? C.green : C.textMuted, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{dk.is_public ? t.public : t.private}</button>
                <button className="dk-btn-secondary" onClick={() => navigate(buildRoute.deckEdit(dk.id))} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{t.edit}</button>
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
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: isMobile ? 10 : 8,
        }}>
          <div className={isMobile ? "dk-scroll-x" : ""} style={{
            display: "flex",
            gap: 4,
            ...(isMobile ? { flexWrap: "nowrap", margin: "0 -20px", padding: "0 20px" } : {}),
          }}>
            {[["myDecks", t.myDecks, myDecks.length], ["favorites", t.favorites, favoriteDecks.length]].map(([id, label, count]) => (
              <button key={id} className="dk-tab" onClick={() => setTab(id)} style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: tab === id ? C.accentSoft : C.bg,
                color: tab === id ? C.accent : C.textSecondary,
                border: `1px solid ${tab === id ? C.accent + "33" : C.border}`,
                display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>{label} {count > 0 && <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 8, background: tab === id ? C.accent : C.bgSoft, color: tab === id ? "#fff" : C.textMuted, fontWeight: 700 }}>{count}</span>}</button>
            ))}
          </div>
          {tab === "myDecks" && (
            <button className="dk-btn" onClick={() => navigate(ROUTES.DECKS_NEW)} style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
              color: "#fff", border: "none", cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
              width: isMobile ? "100%" : "auto",
            }}>{t.create}</button>
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
            <CIcon name={tab === "myDecks" ? "book" : "star"} size={36} />
            <p style={{ fontSize: 15, color: C.textMuted, marginTop: 12 }}>{tab === "myDecks" ? t.noDecks : t.noFavorites}</p>
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
              // SUBJ_COLOR returns a color id like "blue" — resolve to hex via DECK_COLORS.
              // We need a hex (not CSS var) because the styles below use hex+alpha
              // suffixes (groupAccent + "10" etc.) for soft tints, which don't work with var(--c-xxx).
              const ACCENT_HEX = "#2383E2";
              const subjId = group.classObj ? SUBJ_COLOR?.[group.classObj.subject] : null;
              const subjAccent = subjId ? (DECK_COLORS.find(c => c.id === subjId)?.value || ACCENT_HEX) : null;
              const groupAccent = subjAccent || (firstDeck ? resolveColor(firstDeck) : ACCENT_HEX);
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
                          onClick={() => navigate(`${ROUTES.DECKS_NEW}?${QUERY.CLASS}=${encodeURIComponent(group.classObj.id)}`)}
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
                        {group.decks.map((dk, i) => renderDeckRow(dk, i, { isFav: tab === "favorites" }))}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customize favorite modal — class picker. The user is taken into the
          editor immediately after picking a class (or "no class"), so this is
          a quick decision rather than a config form. */}
      {customizingFav && (
        <div
          onClick={() => setCustomizingFav(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: 20,
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.bg, borderRadius: 14, padding: 24,
              maxWidth: 420, width: "100%",
              maxHeight: "85vh", overflowY: "auto",
              boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{t.addToWhichFav}</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 6 }}>{customizingFav.title}</p>
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>{t.customizeFavHint}</p>

            {userClasses.length === 0 ? (
              <p style={{ fontSize: 13, color: C.textMuted, padding: "12px 8px", textAlign: "center", marginBottom: 8 }}>
                {t.noClassesYetFav}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {userClasses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCustomizeFavorite(customizingFav, c.id)}
                    style={{
                      padding: 12, borderRadius: 10,
                      background: C.bg, border: `1px solid ${C.border}`,
                      textAlign: "left",
                      display: "flex", alignItems: "center", gap: 10,
                      fontFamily: "'Outfit',sans-serif", cursor: "pointer",
                    }}
                  >
                    <CIcon name={SUBJ_ICON[c.subject] || "book"} size={20} inline />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{c.subject} · {c.grade}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => handleCustomizeFavorite(customizingFav, null)}
              style={{
                width: "100%", padding: 10, borderRadius: 8,
                fontSize: 13, fontWeight: 500,
                background: C.bgSoft, color: C.textSecondary,
                border: `1px solid ${C.border}`, cursor: "pointer",
                fontFamily: "'Outfit',sans-serif", marginBottom: 8,
              }}
            >{t.noClassFav}</button>
            <button
              onClick={() => setCustomizingFav(null)}
              style={{
                width: "100%", padding: 10, borderRadius: 8,
                fontSize: 13, fontWeight: 500,
                background: "transparent", color: C.textMuted,
                border: "none", cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >{t.cancel}</button>
          </div>
        </div>
      )}
    </div>
  );
}
