import type { LucideIcon } from 'lucide-react'

import { getMessages, languageStore } from '../../../lib/i18n'
import type { SupportedLanguage } from '../../../lib/i18n'
import type { WebDomain } from '../../../routes/web-domain'

export interface DomainNavMetaContext {
  language: SupportedLanguage
}

export interface DomainNavItemMeta {
  id: string
  label: string
  desc: string
  to: string
  icon: LucideIcon
}

export interface DomainNavGroupMeta {
  id: string
  title: string | null
  items: Array<DomainNavItemMeta>
}

export interface DomainNavMeta {
  id?: string
  label: string
  desc: string
  icon: LucideIcon
  defaultTo: string
  category?: string
  groups: Array<DomainNavGroupMeta>
}

export type DomainNavMetaFactory = (
  context: DomainNavMetaContext,
) => DomainNavMeta

export interface AppLayoutDomainCapabilities extends Record<string, unknown> {
  nav?: DomainNavMetaFactory
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

function normalizeDomainNavMeta(
  navMeta: DomainNavMeta,
  defaultCategory: string,
): AppScene {
  const defaultTo = normalizeNavPath(navMeta.defaultTo)

  return {
    id: navMeta.id ?? createDefaultSceneId(defaultTo),
    label: navMeta.label,
    description: navMeta.desc,
    category: navMeta.category ?? defaultCategory,
    icon: navMeta.icon,
    defaultTo,
    groups: navMeta.groups.map((group) => ({
      id: group.id,
      title: group.title,
      items: group.items.map((item) => ({
        id: item.id,
        label: item.label,
        description: item.desc,
        to: normalizeNavPath(item.to),
        icon: item.icon,
      })),
    })),
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
    )
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

export function getSceneById(navConfig: AppNavConfig, sceneId: string) {
  return navConfig.scenes.find((scene) => scene.id === sceneId) ?? null
}
