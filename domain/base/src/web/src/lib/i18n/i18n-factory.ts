import * as React from 'react'

import type { SupportedLanguage } from './language-store'
import { languageStore, useLanguageStore } from './language-store'

export type I18nMessageParams = Partial<Record<string, number | string>>
export type I18nMessageFormatter = (
  template: string,
  params?: I18nMessageParams,
) => string

export type I18nCatalogMessages<TMessages> = Readonly<
  Record<SupportedLanguage, TMessages>
>

export interface I18nTranslation<TMessages> {
  language: SupportedLanguage
  t: TMessages
  format: I18nMessageFormatter
}

export interface I18nCatalog<TMessages> {
  format: I18nMessageFormatter
  getMessages: (language?: SupportedLanguage) => TMessages
  useTranslation: () => I18nTranslation<TMessages>
}

export function formatMessage(
  template: string,
  params?: I18nMessageParams,
) {
  if (!params) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key]
    return value === undefined ? match : String(value)
  })
}

export function createI18nCatalog<TMessages>(
  messages: I18nCatalogMessages<TMessages>,
): I18nCatalog<TMessages> {
  const getMessages = (
    language: SupportedLanguage = languageStore.getSnapshot(),
  ) => messages[language]

  const useTranslation = () => {
    const language = useLanguageStore()
    const t = getMessages(language)

    return React.useMemo(
      () => ({ language, t, format: formatMessage }),
      [language, t],
    )
  }

  return {
    format: formatMessage,
    getMessages,
    useTranslation,
  }
}
