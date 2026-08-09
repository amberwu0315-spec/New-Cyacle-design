import type { LucideIcon } from 'lucide-react'

import { getMessages, languageStore } from '#/lib/i18n/index.ts'
import type { SupportedLanguage } from '#/lib/i18n/index.ts'
import type { WebDomain } from '../../../routes/web-domain.ts'
import type { WorkspaceSelectionItem } from './workspace-selection.ts'
import type { PermissionCodeMap } from '#/context/permission-context.tsx'

export interface DomainNavMetaContext {
  language: SupportedLanguage
  workspace?: WorkspaceSelectionItem | null
}

export interface DomainNavItemMeta {
  id: string
  label: string
  desc: string
  to: string
  icon: LucideIcon
  permissionCode?: string
}

export interface DomainNavGroupMeta {
  id: string
  title: string | null
  items: Array<DomainNavItemMeta>
  permissionCode?: string
}

export interface DomainNavMeta {
  id?: string
  label: string
  desc: string
  icon: LucideIcon
  defaultTo: string
  category?: string
  groups: Array<DomainNavGroupMeta>
  permissionCode?: string
}

export type DomainNavMetaFactory = (
  context: DomainNavMetaContext,
) => DomainNavMeta

export interface AppLayoutDomainCapabilities extends Record<string, unknown> {
  nav?: DomainNavMetaFactory
  permissionCodes?: ReadonlyArray<string>
}

export interface AppNavItem {
  id: string
  label: string
  description: string
  to: string
  icon: LucideIcon
}

export interface AppNavGroup {
  id: string
  title: string | null
  items: Array<AppNavItem>
}

export interface AppScene {
  id: string
  label: string
  description: string
  category: string
  icon: LucideIcon
  defaultTo: string
  groups: Array<AppNavGroup>
}

export interface AppSceneCategory {
  title: string
  sceneIds: Array<string>
}

export interface AppNavConfig {
  scenes: Array<AppScene>
  categories: Array<AppSceneCategory>
  defaultSceneId: string
}

export interface AppNavConfigOptions {
  language?: SupportedLanguage
  permissionCodeMap?: PermissionCodeMap
  workspace?: WorkspaceSelectionItem | null
}

export const MOCK_USER = {
  name: 'Cyacle',
  role: '',
  email: 'cyacle@yorun.ai',
}

function normalizeNavPath(path: string) {
  const trimmedPath = path.trim()

  if (!trimmedPath) {
    return '/'
  }

  if (trimmedPath.startsWith('/')) {
    return trimmedPath
  }

  return `/${trimmedPath}`
}

function createDefaultSceneId(defaultTo: string) {
  const normalizedPath = normalizeNavPath(defaultTo)
  const pathKey = normalizedPath
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

  return pathKey ? `domain-${pathKey}` : 'domain-root'
}

function hasPermission(
  permissionCodeMap: PermissionCodeMap | undefined,
  code?: string,
) {
  return !permissionCodeMap || !code || Boolean(permissionCodeMap[code])
}

function normalizeDomainNavMeta(
  navMeta: DomainNavMeta,
  defaultCategory: string,
  permissionCodeMap?: PermissionCodeMap,
): AppScene | null {
  if (!hasPermission(permissionCodeMap, navMeta.permissionCode)) {
    return null
  }

  const groups = navMeta.groups.flatMap((group) => {
    if (!hasPermission(permissionCodeMap, group.permissionCode)) {
      return []
    }

    const items = group.items
      .filter((item) => hasPermission(permissionCodeMap, item.permissionCode))
      .map((item) => ({
        id: item.id,
        label: item.label,
        description: item.desc,
        to: normalizeNavPath(item.to),
        icon: item.icon,
      }))

    return items.length
      ? [
          {
            id: group.id,
            title: group.title,
            items,
          },
        ]
      : []
  })

  if (!groups.length) {
    return null
  }

  const requestedDefaultTo = normalizeNavPath(navMeta.defaultTo)
  const visibleDefaultItem = groups
    .flatMap((group) => group.items)
    .find((item) => item.to === requestedDefaultTo)
  const defaultTo = visibleDefaultItem?.to ?? groups[0]?.items[0]?.to ?? '/'

  return {
    id: navMeta.id ?? createDefaultSceneId(defaultTo),
    label: navMeta.label,
    description: navMeta.desc,
    category: navMeta.category ?? defaultCategory,
    icon: navMeta.icon,
    defaultTo,
    groups,
  }
}

function getDomainNavMeta(
  webDomain: WebDomain,
  context: DomainNavMetaContext,
) {
  const navMetaFactory = (
    webDomain.capabilities as AppLayoutDomainCapabilities | undefined
  )?.nav

  if (typeof navMetaFactory !== 'function') {
    return null
  }

  return navMetaFactory(context)
}

export function createAppNavConfig(
  webDomains: ReadonlyArray<WebDomain>,
  options: AppNavConfigOptions = {},
): AppNavConfig {
  const language = options.language ?? languageStore.getSnapshot()
  const t = getMessages(language)
  const navMetaContext = {
    language,
    workspace: options.workspace ?? null,
  }
  const scenes: Array<AppScene> = []
  const categories: Array<AppSceneCategory> = []

  for (const webDomain of webDomains) {
    const navMeta = getDomainNavMeta(webDomain, navMetaContext)

    if (!navMeta) {
      continue
    }

    const scene = normalizeDomainNavMeta(
      navMeta,
      t.common.nav.categories.businessApps,
      options.permissionCodeMap,
    )
    if (!scene) {
      continue
    }
    scenes.push(scene)

    const category = categories.find((item) => item.title === scene.category)
    if (category) {
      category.sceneIds.push(scene.id)
      continue
    }

    categories.push({
      title: scene.category,
      sceneIds: [scene.id],
    })
  }

  return {
    scenes,
    categories,
    defaultSceneId: scenes[0]?.id ?? '',
  }
}

export function createAppPermissionCodes(
  webDomains: ReadonlyArray<WebDomain>,
  options: Pick<AppNavConfigOptions, 'language' | 'workspace'> = {},
) {
  const language = options.language ?? languageStore.getSnapshot()
  const context = {
    language,
    workspace: options.workspace ?? null,
  }
  const codes = new Set<string>()

  for (const webDomain of webDomains) {
    const capabilities = webDomain.capabilities as
      | AppLayoutDomainCapabilities
      | undefined

    for (const code of capabilities?.permissionCodes ?? []) {
      if (code) codes.add(code)
    }

    const navMeta = getDomainNavMeta(webDomain, context)
    if (!navMeta) continue
    if (navMeta.permissionCode) codes.add(navMeta.permissionCode)

    for (const group of navMeta.groups) {
      if (group.permissionCode) codes.add(group.permissionCode)

      for (const item of group.items) {
        if (item.permissionCode) codes.add(item.permissionCode)
      }
    }
  }

  return [...codes]
}

export function getSceneById(navConfig: AppNavConfig, sceneId: string) {
  return navConfig.scenes.find((scene) => scene.id === sceneId) ?? null
}
