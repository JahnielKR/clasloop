// src/hooks/useCrossfilter.jsx
//
// F8 Analytics Studio: estado de crossfilter compartido entre los widgets
// de una vista (spec §7.3). En F8 sólo lleva `selectedTopic` (click en un
// tema resalta sus preguntas en otros widgets). Extensible a más ejes
// (alumno, deck) en el futuro sin cambiar la API.

import { createContext, useContext, useMemo, useState } from "react";

const CrossfilterContext = createContext(null);

export function CrossfilterProvider({ children }) {
  const [selectedTopic, setSelectedTopic] = useState(null);

  const value = useMemo(
    () => ({
      selectedTopic,
      toggleTopic: (topic) =>
        setSelectedTopic((cur) => (cur === topic ? null : topic)),
      clear: () => setSelectedTopic(null),
    }),
    [selectedTopic],
  );

  return <CrossfilterContext.Provider value={value}>{children}</CrossfilterContext.Provider>;
}

export function useCrossfilter() {
  return (
    useContext(CrossfilterContext) || {
      selectedTopic: null,
      toggleTopic: () => {},
      clear: () => {},
    }
  );
}
