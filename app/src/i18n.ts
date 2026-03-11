import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from '../public/locales/en/translation.json';
import trTranslation from '../public/locales/tr/translation.json';
import deTranslation from '../public/locales/de/translation.json';
import esTranslation from '../public/locales/es/translation.json';
import ptTranslation from '../public/locales/pt/translation.json';
import plTranslation from '../public/locales/pl/translation.json';
import ruTranslation from '../public/locales/ru/translation.json';

const resources = {
  en: {
    translation: enTranslation,
  },
  tr: {
    translation: trTranslation,
  },
  de: {
    translation: deTranslation,
  },
  es: {
    translation: esTranslation,
  },
  pt: {
    translation: ptTranslation,
  },
  pl: {
    translation: plTranslation,
  },
  ru: {
    translation: ruTranslation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
