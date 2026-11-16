import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations from '../data/translations';

const LANG_KEY = '@gymapp_language';

const LanguageContext = createContext();

// Idioma inicial: el del dispositivo/navegador si es español, si no inglés.
const detectDeviceLanguage = () => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    return locale.toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'en';
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(detectDeviceLanguage);

  // Carga el idioma guardado al arrancar
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved) setLanguageState(saved);
    });
  }, []);

  const setLanguage = useCallback(async (lang) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
  }, []);

  const t = translations[language] || translations.en;
  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook de acceso rápido
export const useLanguage = () => useContext(LanguageContext);
