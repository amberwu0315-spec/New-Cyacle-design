import { languageStore, useLanguageStore } from '#/lib/i18n/index.ts'

import { assistantWorkbenchMessages as enUSAssistantWorkbenchMessages } from './locales/en-US/assistant-workbench.ts'
import { assistantWorkbenchMessages as zhCNAssistantWorkbenchMessages } from './locales/zh-CN/assistant-workbench.ts'

export type AppLanguage = 'zh-CN' | 'en-US'

export interface AppMessages {
  assistantWorkbench: typeof zhCNAssistantWorkbenchMessages
}

const MESSAGES = {
  'zh-CN': {
    assistantWorkbench: zhCNAssistantWorkbenchMessages,
  },
  'en-US': {
    assistantWorkbench: enUSAssistantWorkbenchMessages,
  },
} satisfies Record<AppLanguage, AppMessages>

export function getAssistantWorkbenchMessages(language: AppLanguage) {
  return MESSAGES[language]
}

export function useOptionalI18n() {
  const language = useLanguageStore() as AppLanguage

  return {
    language,
    messages: getAssistantWorkbenchMessages(language),
  }
}

export const useI18n = useOptionalI18n

export function getCurrentLanguage(): AppLanguage {
  return languageStore.getSnapshot() as AppLanguage
}
