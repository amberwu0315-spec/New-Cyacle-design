import type { LucideIcon } from 'lucide-react'

import type { DomainRouteTree } from '../../../routes/helpers/domain-route-tree'

export interface DomainNavMetaContext {
  locale: string
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

export interface AppLayoutDomainMetas extends Record<string, unknown> {
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
  locale?: string
}

const DEFAULT_DOMAIN_NAV_CATEGORY = '业务应用'
const DEFAULT_APP_NAV_LOCALE = 'zh-CN'

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

function normalizeDomainNavMeta(navMeta: DomainNavMeta): AppScene {
  const defaultTo = normalizeNavPath(navMeta.defaultTo)

  return {
    id: navMeta.id ?? createDefaultSceneId(defaultTo),
    label: navMeta.label,
    description: navMeta.desc,
    category: navMeta.category ?? DEFAULT_DOMAIN_NAV_CATEGORY,
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
  domainRouteTree: DomainRouteTree,
  context: DomainNavMetaContext,
) {
  const navMetaFactory = (
    domainRouteTree.metas as AppLayoutDomainMetas | undefined
  )?.nav

  if (typeof navMetaFactory !== 'function') {
    return null
  }

  return navMetaFactory(context)
}

export function createAppNavConfig(
  domainRouteTrees: Array<DomainRouteTree>,
  options: AppNavConfigOptions = {},
): AppNavConfig {
  const navMetaContext = {
    locale: options.locale ?? DEFAULT_APP_NAV_LOCALE,
  }
  const scenes: Array<AppScene> = []
  const categories: Array<AppSceneCategory> = []

  for (const domainRouteTree of domainRouteTrees) {
    const navMeta = getDomainNavMeta(domainRouteTree, navMetaContext)

    if (!navMeta) {
      continue
    }

    const scene = normalizeDomainNavMeta(navMeta)
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
