"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, type Locale } from "./translations";

type DeepString<T> = {
  [K in keyof T]: T[K] extends object ? DeepString<T[K]> : string;
};

export type TranslationDictionary = DeepString<typeof translations.en>;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationDictionary;
}

const I18nContext = createContext<I18nContextType>({
  locale: "pt-BR",
  setLocale: () => {},
  t: translations["pt-BR"] as unknown as TranslationDictionary,
});

const STORAGE_KEY = "openreply_locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt-BR");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read from localStorage or cookie
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === "en" || saved === "pt-BR") {
      setLocaleState(saved);
    } else {
      // Default to pt-BR if browser language starts with pt
      const browserLang = navigator.language?.toLowerCase();
      if (browserLang?.startsWith("pt")) {
        setLocaleState("pt-BR");
      }
    }
    setMounted(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
  };

  const t = translations[locale] ?? translations["pt-BR"];

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within a LanguageProvider");
  }
  return context;
}
