import type * as React from 'react'

import type {
  AppShellBreadcrumbItem,
  AppShellFrameSidebarNavLabels,
  AppShellNavConfig,
  AppShellNavItem,
  AppShellScene,
  AppShellSidebarState,
} from '../types'

export function getCategorizedScenes(navConfig: AppShellNavConfig) {
  return navConfig.categories.map((category) => ({
    title: category.title,
    scenes: category.sceneIds
      .map((sceneId) =>
        navConfig.scenes.find((scene) => scene.id === sceneId),
      )
      .filter((scene): scene is AppShellScene => scene !== undefined),
  }))
}

function normalizePath(pathname: string) {
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

function getSceneById(navConfig: AppShellNavConfig, sceneId: string) {
  return navConfig.scenes.find((scene) => scene.id === sceneId) ?? null
}

export function getActiveNavMatch(navConfig: AppShellNavConfig, pathname: string) {
  let activeScene: AppShellScene | null = null
  let activeItem: AppShellNavItem | null = null
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

export function getBreadcrumbItems(
  activeScene: AppShellScene,
  activeItem: AppShellNavItem | null,
  sidebarState: AppShellSidebarState,
): Array<AppShellBreadcrumbItem> {
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

export function resolveScenePickerLabel(
  label: AppShellFrameSidebarNavLabels['scenePicker'],
  scene: AppShellScene,
) {
  if (typeof label === 'function') {
    return label(scene)
  }

  return label
}

export function shouldUseBrowserNavigation(
  event: React.MouseEvent<HTMLAnchorElement>,
) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  )
}
