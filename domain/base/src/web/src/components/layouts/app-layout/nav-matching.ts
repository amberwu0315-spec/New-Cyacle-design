import { getSceneById } from '#/components/layouts/app-layout/nav-config.tsx'
import type { AppNavConfig, AppNavItem, AppScene } from '#/components/layouts/app-layout/nav-config.tsx'

export interface BreadcrumbItem {
  label: string
  href?: string | null
}

export type SidebarDisplayState = 'expanded' | 'collapsed'

export function normalizePath(pathname: string) {
  if (!pathname) {
    return '/'
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }

  return pathname
}

function getMatchedPrefixLength(pathname: string, target: string) {
  const normalizedPathname = normalizePath(pathname)
  const normalizedTarget = normalizePath(target)

  if (normalizedPathname === normalizedTarget) {
    return normalizedTarget.length
  }

  if (
    normalizedTarget !== '/' &&
    normalizedPathname.startsWith(`${normalizedTarget}/`)
  ) {
    return normalizedTarget.length
  }

  return -1
}

function getActiveMatch(navConfig: AppNavConfig, pathname: string) {
  let activeScene: AppScene | null = null
  let activeItem: AppNavItem | null = null
  let bestLength = -1

  for (const scene of navConfig.scenes) {
    for (const group of scene.groups) {
      for (const item of group.items) {
        const matchLength = getMatchedPrefixLength(pathname, item.to)

        if (matchLength > bestLength) {
          bestLength = matchLength
          activeScene = scene
          activeItem = item
        }
      }
    }
  }

  return {
    activeScene:
      activeScene ??
      getSceneById(navConfig, navConfig.defaultSceneId) ??
      navConfig.scenes[0],
    activeItem,
  }
}

export function getActiveScene(navConfig: AppNavConfig, pathname: string) {
  return getActiveMatch(navConfig, pathname).activeScene
}

export function getActiveNavItem(navConfig: AppNavConfig, pathname: string) {
  return getActiveMatch(navConfig, pathname).activeItem
}

export function getBreadcrumbItems(
  navConfig: AppNavConfig,
  pathname: string,
  sidebarState: SidebarDisplayState,
): Array<BreadcrumbItem> {
  const { activeItem, activeScene } = getActiveMatch(navConfig, pathname)

  if (!activeItem || activeItem.label === activeScene.label) {
    return [{ label: activeScene.label, href: activeScene.defaultTo }]
  }

  if (sidebarState === 'expanded') {
    return [{ label: activeItem.label, href: activeItem.to }]
  }

  return [
    { label: activeScene.label, href: activeScene.defaultTo },
    { label: activeItem.label, href: activeItem.to },
  ]
}

export function getCategorizedScenes(navConfig: AppNavConfig) {
  return navConfig.categories.map((category) => ({
    title: category.title,
    scenes: category.sceneIds
      .map((sceneId) => getSceneById(navConfig, sceneId))
      .filter((scene): scene is AppScene => scene !== null),
  }))
}
