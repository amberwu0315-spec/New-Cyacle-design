import { APP_SCENE_CATEGORIES, APP_SCENES, getSceneById } from './nav-config'
import type { AppNavItem, AppScene } from './nav-config'

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

function getActiveMatch(pathname: string) {
  let activeScene: AppScene | null = null
  let activeItem: AppNavItem | null = null
  let bestLength = -1

  for (const scene of APP_SCENES) {
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
    activeScene: activeScene ?? getSceneById('vine-hub') ?? APP_SCENES[0],
    activeItem,
  }
}

export function getActiveScene(pathname: string) {
  return getActiveMatch(pathname).activeScene
}

export function getActiveNavItem(pathname: string) {
  return getActiveMatch(pathname).activeItem
}

export function getBreadcrumbItems(
  pathname: string,
  sidebarState: SidebarDisplayState,
): Array<BreadcrumbItem> {
  const { activeItem, activeScene } = getActiveMatch(pathname)

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

export function getCategorizedScenes() {
  return APP_SCENE_CATEGORIES.map((category) => ({
    title: category.title,
    scenes: category.sceneIds
      .map((sceneId) => getSceneById(sceneId))
      .filter((scene): scene is AppScene => scene !== null),
  }))
}
