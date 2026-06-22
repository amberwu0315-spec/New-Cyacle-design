import { createI18nCatalog } from './i18n-factory'
import { enUS } from './messages/en-US/index'
import type { Messages } from './messages/zh-CN/index'
import { zhCN } from './messages/zh-CN/index'

export type { Messages }

export const i18nCatalog = createI18nCatalog<Messages>({
  'zh-CN': zhCN,
  'en-US': enUS,
})

export const getMessages = i18nCatalog.getMessages
export const useTranslation = i18nCatalog.useTranslation
