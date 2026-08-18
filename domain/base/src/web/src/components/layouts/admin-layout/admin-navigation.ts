import type { WebDomain } from '../../../routes/web-domain.ts'
import { languageStore } from '../../../lib/i18n/index.ts'
import type { SupportedLanguage } from '../../../lib/i18n/index.ts'

import type { AdminNavigationGroup } from './admin-layout.tsx'

export interface AdminNavMetaContext {
  domainId: string
  language: SupportedLanguage
}

export type AdminNavMetaFactory = (
  context: AdminNavMetaContext,
) => Array<AdminNavigationGroup>

export interface AdminLayoutDomainCapabilities extends Record<string, unknown> {
  adminNav?: AdminNavMetaFactory
  adminPermissionCodes?: ReadonlyArray<string>
}

export interface AdminNavigationOptions {
  language?: SupportedLanguage
}

export function createAdminNavigation(
  webDomains: ReadonlyArray<WebDomain>,
  options: AdminNavigationOptions = {},
): Array<AdminNavigationGroup> {
  const language = options.language ?? languageStore.getSnapshot()
  const groups = new Map<string, AdminNavigationGroup>()

  for (const webDomain of webDomains) {
    const factory = (
      webDomain.capabilities as AdminLayoutDomainCapabilities | undefined
    )?.adminNav

    if (typeof factory !== 'function') {
      continue
    }

    for (const group of factory({ domainId: webDomain.id, language })) {
      const currentGroup = groups.get(group.id)

      if (currentGroup) {
        currentGroup.items.push(...group.items)
        continue
      }

      groups.set(group.id, {
        ...group,
        items: [...group.items],
      })
    }
  }

  return [...groups.values()]
}

export function resolveAdminHomeTo(
  navigation: ReadonlyArray<AdminNavigationGroup>,
): string {
  for (const group of navigation) {
    const firstEnabledItem = group.items.find((item) => !item.disabled)

    if (firstEnabledItem) {
      return firstEnabledItem.to
    }
  }

  return '/admin'
}

export function createAdminPermissionCodes(
  webDomains: ReadonlyArray<WebDomain>,
): Array<string> {
  const codes = new Set<string>()

  for (const webDomain of webDomains) {
    const capabilities = webDomain.capabilities as
      | AdminLayoutDomainCapabilities
      | undefined

    for (const code of capabilities?.adminPermissionCodes ?? []) {
      if (code) codes.add(code)
    }

    const factory = capabilities?.adminNav
    if (typeof factory !== 'function') continue

    for (const group of factory({
      domainId: webDomain.id,
      language: languageStore.getSnapshot(),
    })) {
      for (const item of group.items) {
        if (item.permissionCode) codes.add(item.permissionCode)
      }
    }
  }

  return [...codes]
}
