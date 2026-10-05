import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { t, type Locale, type TranslationKey } from '../i18n/translations'

interface LanguageValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  tr: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('kamaru-locale')
    return saved === 'tl' ? 'tl' : 'en'
  })
  const setLocale = (next: Locale) => {
    setLocaleState(next)
    localStorage.setItem('kamaru-locale', next)
  }
  useEffect(() => {
    document.documentElement.lang = locale === 'tl' ? 'fil' : 'en'
  }, [locale])
  const value = useMemo<LanguageValue>(() => ({
    locale,
    setLocale,
    tr: (key) => t(locale, key),
  }), [locale])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
