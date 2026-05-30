// src/i18n/LanguageContext.js
//
// Provides the active UI language to the whole tree so components (especially
// the 33 Analytics Studio components) can read it without prop-drilling. Fed by
// App.jsx's existing `lang` state. This is the LanguageContext anticipated by
// i18n/index.js — useT() reads it when no explicit `lang` argument is passed.
import { createContext, useContext } from "react";

const LanguageContext = createContext("en");

export function LanguageProvider({ value, children }) {
  return (
    <LanguageContext.Provider value={value || "en"}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}

export default LanguageContext;
