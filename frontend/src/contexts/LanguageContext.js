import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext(null);

const SUPPORTED_LANGS = ['en', 'ka', 'ru'];
const LANG_LABELS = { en: 'English', ka: 'ქართული', ru: 'Русский' };
const LANG_FLAGS = { en: '🇬🇧', ka: '🇬🇪', ru: '🇷🇺' };

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('lang');
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    return 'en';
  });

  const changeLang = useCallback((newLang) => {
    if (SUPPORTED_LANGS.includes(newLang)) {
      setLang(newLang);
      localStorage.setItem('lang', newLang);
    }
  }, []);

  const t = useCallback((key, params) => {
    const keys = key.split('.');
    let val = translations[lang];
    for (const k of keys) {
      if (val && typeof val === 'object') {
        val = val[k];
      } else {
        val = undefined;
        break;
      }
    }
    if (val === undefined) {
      // Fallback to English
      val = translations.en;
      for (const k of keys) {
        if (val && typeof val === 'object') {
          val = val[k];
        } else {
          val = undefined;
          break;
        }
      }
    }
    if (val === undefined) return key;
    if (typeof val === 'string' && params) {
      return val.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
    }
    return val;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{
      lang, changeLang, t,
      SUPPORTED_LANGS, LANG_LABELS, LANG_FLAGS,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
