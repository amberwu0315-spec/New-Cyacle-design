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
import { getMessages } from '#/lib/i18n/index.ts'

function getAppNavCategories(language: AppNavConfigOptions['language']) {
  const t = getMessages(language)

  return {
    basis: t.layout.navCategories.basis,
    accounting: t.layout.navCategories.accounting,
    management: t.layout.navCategories.management,
    dashboard: t.layout.navCategories.dashboard,
    platform: t.layout.navCategories.platform,
    account: t.layout.navCategories.account,
  } as const
}

function groupAppNavConfig(
  config: AppNavConfig,
  options: AppNavConfigOptions = {},
): AppNavConfig {
  const appNavCategories = getAppNavCategories(options.language)
  const appNavCategoryOrder = [
    appNavCategories.basis,
    appNavCategories.accounting,
    appNavCategories.management,
    appNavCategories.dashboard,
    appNavCategories.platform,
    appNavCategories.account,
  ]
  const appNavSceneCategoryById: Record<string, string> = {
    'domain-project': appNavCategories.basis,
    'domain-pcf-factor-api': appNavCategories.basis,
    'domain-accounting': appNavCategories.accounting,
    'domain-cfo': appNavCategories.accounting,
    'domain-document-management': appNavCategories.management,
    'domain-uic': appNavCategories.account,
  }
  const scenes = config.scenes.map((scene) => {
    const category = appNavSceneCategoryById[scene.id] ?? scene.category

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

  for (const categoryTitle of appNavCategoryOrder) {
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
    options,
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
