// ─── i18n/ko.js ────────────────────────────────────────────────────────
//
// PR 73: traducciones en COREANO, agrupadas por namespace.
// Ver en.js para documentación de la estructura.

export default {
  avatarOnboarding: {
    welcome: "환영합니다, {name}님!",
    pickOne: "아바타를 선택하세요",
    sub: "설정에서 언제든지 변경할 수 있습니다.",
    selected: "잘 어울려요!",
    continue: "계속",
    saving: "저장 중...",
  },

  sessionInsightBar: {
    labelOne: "약점",
    labelTwo: "약점",
    failed: "틀렸어요",
    expand: "학생 보기",
    collapse: "숨기기",
    dismiss: "숨기기",
    analyzing: "세션 분석 중…",
    repeatedNote: (name) => `**${name}**님이 두 항목 모두에 나타납니다. 한 주제 이상에서 어려움을 겪고 있습니다.`,
    failerSummary: (wrong, total) => `${wrong}/${total} 틀림`,
  },

  community: {
    pageTitle: "커뮤니티",
    subtitle: "전 세계 교사들이 공유한 덱을 찾아보세요",
    search: "주제 검색...",
    allSubjects: "모든 과목",
    allLanguages: "모든 언어",
    mostUsed: "최다 사용",
    topRated: "최고 평점",
    newest: "최신순",
    questions: "문제",
    uses: "사용",
    saveToMyDecks: "내 덱에 저장",
    saved: "저장됨!",
    back: "뒤로",
    by: "",
    adaptedFrom: "원작 각색:",
    noResults: "덱을 찾을 수 없습니다.",
    favorite: "즐겨찾기",
    favorited: "즐겨찾기됨",
    favoriteAdd: "즐겨찾기에 추가",
    favoriteRemove: "즐겨찾기에서 제거",
    addToWhich: "어느 수업에 추가하시겠습니까?",
    noClass: "수업 없이 저장",
    noClassesYet: "아직 수업이 없습니다. 세션에서 먼저 만드세요.",
    cancel: "취소",
    langs: ["영어", "스페인어", "한국어"],
  },

  dayDateModal: {
    titleAssign: "Day {n}은(는) 언제인가요?",
    titleEdit: "Day {n} 날짜 변경",
    bodyAssign: "이 날짜를 가르칠 날을 선택하세요. 오늘 예정된 덱은 Today에 표시되고, 미래 날짜는 다가오는 날에 표시됩니다.",
    bodyEdit: "이 날의 날짜를 업데이트하세요. Today는 이 날짜를 기준으로 덱을 표시합니다.",
    save: "저장",
    cancel: "취소",
    saving: "저장 중…",
    errorGeneric: "날짜를 저장할 수 없습니다. 다시 시도하세요.",
    quickToday: "오늘",
    quickTomorrow: "내일",
    quickNextWeek: "다음 주",
  },
};
