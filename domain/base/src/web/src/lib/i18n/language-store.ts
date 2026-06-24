import * as React from 'react'
import Cookies from 'js-cookie'

export const LANGUAGE_COOKIE_NAME = 'lang'
export const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US'] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

type LanguageListener = () => void

const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-CN'
const listeners = new Set<LanguageListener>()

function normalizeLanguage(value: string | undefined): SupportedLanguage {
  return value === 'en-US' || value === 'zh-CN' ? value : DEFAULT_LANGUAGE
}

function getCookieLanguage() {
  return normalizeLanguage(Cookies.get(LANGUAGE_COOKIE_NAME))
}

function isIpAddress(hostname: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')
}

function getSharedCookieDomain() {
  if (typeof window === 'undefined') {
    return undefined
  }

  const hostname = window.location.hostname.toLowerCase()
  const labels = hostname.split('.').filter(Boolean)

  if (labels.length < 2 || hostname === 'localhost' || isIpAddress(hostname)) {
    return undefined
  }

  return `.${labels.slice(-2).join('.')}`
}

let currentLanguage = getCookieLanguage()

function emitLanguageChange() {
  listeners.forEach((listener) => listener())
}

function applyDocumentLanguage(language: SupportedLanguage) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.lang = language
}

function persistLanguage(language: SupportedLanguage) {
  if (typeof window === 'undefined') {
    return
  }

  Cookies.set(LANGUAGE_COOKIE_NAME, language, {
    path: '/',
    expires: 365,
    domain: getSharedCookieDomain(),
    secure: window.location.protocol === 'https:',
    sameSite: 'none',
  })
}

applyDocumentLanguage(currentLanguage)

export const languageStore = {
  getSnapshot: () => currentLanguage,
  getServerSnapshot: () => DEFAULT_LANGUAGE,
  subscribe: (listener: LanguageListener) => {
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  },
  setLanguage: (language: SupportedLanguage) => {
    if (language === currentLanguage) {
      return
    }

    currentLanguage = language
    applyDocumentLanguage(language)
    persistLanguage(language)
    emitLanguageChange()
  },
  toggleLanguage: () => {
    languageStore.setLanguage(currentLanguage === 'zh-CN' ? 'en-US' : 'zh-CN')
  },
}

export function useLanguageStore() {
  return React.useSyncExternalStore(
    languageStore.subscribe,
    languageStore.getSnapshot,
    languageStore.getServerSnapshot,
  )
}
