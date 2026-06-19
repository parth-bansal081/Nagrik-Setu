'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './translations/en.json';
import hi from './translations/hi.json';

type Language = 'en' | 'hi';
const translations: Record<Language, any> = { en, hi };

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'en' || saved === 'hi')) {
      setLanguageState(saved);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        // Fallback to English
        let engValue: any = translations['en'];
        for (const ek of keys) {
          if (engValue && engValue[ek] !== undefined) {
            engValue = engValue[ek];
          } else {
            return key;
          }
        }
        return engValue;
      }
    }
    return typeof value === 'string' ? value : key;
  };

  // Prevent hydration flicker by returning children with default context values until mounted
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
