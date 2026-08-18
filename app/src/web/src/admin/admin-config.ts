import {
  createAdminPermissionCodes,
  createAdminNavigation,
  resolveAdminHomeTo,
  type SupportedLanguage,
} from '@carbonnt-cyacle/web-base'

import { webModules } from '#/vineModules.gen.ts'

export function getAdminNavigation(language?: SupportedLanguage) {
  return createAdminNavigation(webModules, { language })
}

export const adminPermissionCodes = createAdminPermissionCodes(webModules)

export const adminHomeTo = resolveAdminHomeTo(getAdminNavigation())
