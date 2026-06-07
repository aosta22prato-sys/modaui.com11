import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zh from './locales/zh.json';
import it from './locales/it.json';
import es from './locales/es.json';
import el from './locales/el.json';

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  it: { translation: it },
  es: { translation: es },
  el: { translation: el },
};

const defaultLng = (typeof window !== 'undefined' && localStorage.getItem('lang'))
  || (typeof navigator !== 'undefined' && navigator.language?.startsWith('zh') ? 'zh' : 'en');

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
