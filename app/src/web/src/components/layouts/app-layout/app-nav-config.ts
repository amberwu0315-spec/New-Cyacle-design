import {
  createAppNavConfig,
  type AppNavConfig,
  type AppNavConfigOptions,
  type WebDomain,
} from '@carbonnt-cyacle/web-base'

import {
  DEFAULT_APP_EDITION,
  resolveAppEditionRegistration,
} from '#/app-edition.ts'

const APP_NAV_CATEGORIES = {
  basis: '基础',
  accounting: '核算',
  management: '管理',
  dashboard: '驾驶舱',
  platform: '平台',
  account: '账号',
} as const

const APP_NAV_CATEGORY_ORDER = [
  APP_NAV_CATEGORIES.basis,
  APP_NAV_CATEGORIES.accounting,
  APP_NAV_CATEGORIES.management,
  APP_NAV_CATEGORIES.dashboard,
  APP_NAV_CATEGORIES.platform,
  APP_NAV_CATEGORIES.account,
]

const APP_NAV_SCENE_CATEGORY_BY_ID: Record<string, string> = {
  'domain-project': APP_NAV_CATEGORIES.basis,
  'domain-pcf-factor-api': APP_NAV_CATEGORIES.basis,
  'domain-accounting': APP_NAV_CATEGORIES.accounting,
  'domain-cfo': APP_NAV_CATEGORIES.accounting,
  'domain-document-management': APP_NAV_CATEGORIES.management,
  'domain-uic': APP_NAV_CATEGORIES.account,
}

function groupAppNavConfig(config: AppNavConfig): AppNavConfig {
  const scenes = config.scenes.map((scene) => {
    const category = APP_NAV_SCENE_CATEGORY_BY_ID[scene.id] ?? scene.category

    if (category === scene.category) {
      return scene
    }

    return {
      ...scene,
      category,
    }
  })
  const sceneIdsByCategory = new Map<string, Array<string>>()

  for (const scene of scenes) {
    const sceneIds = sceneIdsByCategory.get(scene.category)

    if (sceneIds) {
      sceneIds.push(scene.id)
      continue
    }

    sceneIdsByCategory.set(scene.category, [scene.id])
  }

  const orderedCategoryTitles: Array<string> = []
  const handledCategoryTitles = new Set<string>()

  for (const categoryTitle of APP_NAV_CATEGORY_ORDER) {
    if (!sceneIdsByCategory.has(categoryTitle)) {
      continue
    }

    orderedCategoryTitles.push(categoryTitle)
    handledCategoryTitles.add(categoryTitle)
  }

  for (const category of config.categories) {
    if (
      handledCategoryTitles.has(category.title) ||
      !sceneIdsByCategory.has(category.title)
    ) {
      continue
    }

    orderedCategoryTitles.push(category.title)
    handledCategoryTitles.add(category.title)
  }

  for (const categoryTitle of sceneIdsByCategory.keys()) {
    if (handledCategoryTitles.has(categoryTitle)) {
      continue
    }

    orderedCategoryTitles.push(categoryTitle)
  }

  return {
    ...config,
    scenes,
    categories: orderedCategoryTitles.map((title) => ({
      title,
      sceneIds: sceneIdsByCategory.get(title) ?? [],
    })),
  }
}

export function createConfiguredAppNavConfig(
  webDomains: ReadonlyArray<WebDomain>,
  options: AppNavConfigOptions = {},
  appEdition = DEFAULT_APP_EDITION,
): AppNavConfig {
  const registration = resolveAppEditionRegistration<
    AppNavConfigOptions,
    AppNavConfig
  >(webDomains, appEdition)

  return groupAppNavConfig(
    registration?.createNavConfig(options) ??
      createAppNavConfig(webDomains, options),
  )
}

export function resolveAppEditionHomeTo(
  webDomains: ReadonlyArray<WebDomain>,
  appEdition = DEFAULT_APP_EDITION,
) {
  return (
    resolveAppEditionRegistration<AppNavConfigOptions, AppNavConfig>(
      webDomains,
      appEdition,
    )?.homeTo ?? '/cfp'
  )
}
