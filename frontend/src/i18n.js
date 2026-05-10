import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslation from './locales/en/translation.json';
import arTranslation from './locales/ar/translation.json';

const supportedLanguages = [
  'en',
  'ar',
  // TODO: 'de' to be added later
];

const applyLanguageDirection = (lng) => { // RTL
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr'; // RTL
  document.documentElement.lang = lng; // RTL
}; // RTL

i18n.on('languageChanged', applyLanguageDirection); // RTL

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      ar: { translation: arTranslation },
    },
    supportedLngs: supportedLanguages,
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false,
    },
  })
  .then(() => applyLanguageDirection(i18n.language)); // RTL

export default i18n;
