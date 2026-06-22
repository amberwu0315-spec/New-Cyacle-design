import { createI18nCatalog } from '@carbonnt-cyacle/web-base'

import { enUS } from './messages/en-US'
import type { Messages } from './messages/zh-CN'
import { zhCN } from './messages/zh-CN'

export type { Messages }

export const i18nCatalog = createI18nCatalog<Messages>({
  'zh-CN': zhCN,
  'en-US': enUS,
})

export const getMessages = i18nCatalog.getMessages
export const useTranslation = i18nCatalog.useTranslation
