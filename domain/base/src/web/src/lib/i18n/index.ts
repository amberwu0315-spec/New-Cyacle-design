import type { SupportedLanguage } from './language-store'
import { languageStore, useLanguageStore } from './language-store'
import { enUS } from './messages/en-US/index'
import type { Messages } from './messages/zh-CN/index'
import { zhCN } from './messages/zh-CN/index'

export { languageStore, useLanguageStore } from './language-store'
export type { SupportedLanguage } from './language-store'
export type { Messages } from './messages/zh-CN/index'

export type MessageParams = Partial<Record<string, number | string>>

const MESSAGES = {
  'zh-CN': zhCN,
  'en-US': enUS,
} satisfies Record<SupportedLanguage, Messages>

export function formatMessage(template: string, params?: MessageParams) {
  if (!params) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key]
    return value === undefined ? match : String(value)
  })
}

export function getMessages(
  language: SupportedLanguage = languageStore.getSnapshot(),
) {
  return MESSAGES[language]
}

export function useTranslation() {
  const language = useLanguageStore()
  const t = getMessages(language)

  return { language, t }
}
