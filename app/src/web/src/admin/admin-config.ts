import {
  createAdminNavigation,
  resolveAdminHomeTo,
} from '@carbonnt-cyacle/web-base'

import { webModules } from '#/vineModules.gen.ts'

export const adminNavigation = createAdminNavigation(webModules)

export const adminHomeTo = resolveAdminHomeTo(adminNavigation)
