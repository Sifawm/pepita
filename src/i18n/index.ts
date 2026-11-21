import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import es from './es.json'

// index.html ships the fallback language's texts (see vite.config.ts); once the language is known, they follow it.
i18n.on('languageChanged', (lng) => {
  document.documentElement.setAttribute('lang', lng)
  document.querySelector('meta[name="description"]')?.setAttribute('content', i18n.t('app.description'))
})

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en } },
    supportedLngs: ['es', 'en'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: 'en',
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
    interpolation: { escapeValue: false },
  })

export default i18n
