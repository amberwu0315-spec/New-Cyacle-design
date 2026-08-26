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

export const DEFAULT_APP_HOME_TO = '/project/projects'

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

function splitUicEnterpriseManagementScene(config: AppNavConfig): AppNavConfig {
  const uicSceneIndex = config.scenes.findIndex(
    (scene) => scene.id === 'domain-uic',
  )
  const uicScene = config.scenes[uicSceneIndex]

  if (!uicScene) {
    return config
  }

  const enterpriseGroup = uicScene.groups.find(
    (group) => group.id === 'uic-enterprise-management',
  )

  if (!enterpriseGroup?.items.length) {
    return config
  }

  const enterpriseDefaultTo = enterpriseGroup.items[0]?.to

  if (!enterpriseDefaultTo) {
    return config
  }

  const enterpriseScene = {
    ...uicScene,
    id: 'domain-uic-enterprise-management',
    label: enterpriseGroup.title ?? enterpriseGroup.items[0]!.label,
    defaultTo: enterpriseDefaultTo,
    groups: [{ ...enterpriseGroup, title: null }],
  }
  const scenes = [...config.scenes]

  scenes.splice(
    uicSceneIndex,
    1,
    {
      ...uicScene,
      groups: uicScene.groups.filter(
        (group) => group.id !== enterpriseGroup.id,
      ),
    },
    enterpriseScene,
  )

  return { ...config, scenes }
}

function groupAppNavConfig(
  config: AppNavConfig,
  options: AppNavConfigOptions = {},
): AppNavConfig {
  type AppScene = AppNavConfig['scenes'][number]
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
    'domain-uic-enterprise-management': appNavCategories.account,
  }
  const appNavCategoryByKey: Record<string, string> = {
    basis: appNavCategories.basis,
    accounting: appNavCategories.accounting,
    management: appNavCategories.management,
    dashboard: appNavCategories.dashboard,
    platform: appNavCategories.platform,
    account: appNavCategories.account,
  }
  const scenes = config.scenes.flatMap((scene) => {
    const sceneCategory = appNavSceneCategoryById[scene.id] ?? scene.category
    const groupsByCategory = new Map<string | null, AppScene['groups']>()
    const sceneMetaByKey = new Map<
      string | null,
      {
        categoryKey: string | null
        firstItem: AppScene['groups'][number]['items'][number]
      }
    >()

    for (const group of scene.groups) {
      for (const item of group.items) {
        const categoryKey = item.category?.trim() || null
        const sceneKey = item.standaloneScene
          ? `${categoryKey ?? ''}::${item.id}`
          : categoryKey
        const groups = groupsByCategory.get(sceneKey) ?? []
        let targetGroup = groups.find((candidate) => candidate.id === group.id)

        if (!targetGroup) {
          targetGroup = { ...group, items: [] }
          groups.push(targetGroup)
        }

        targetGroup.items.push(item)
        groupsByCategory.set(sceneKey, groups)
        if (!sceneMetaByKey.has(sceneKey)) {
          sceneMetaByKey.set(sceneKey, { categoryKey, firstItem: item })
        }
      }
    }
    return Array.from(groupsByCategory.entries()).flatMap(
      ([sceneKey, groups]) => {
        const sceneMeta = sceneMetaByKey.get(sceneKey)
        const firstItem = sceneMeta?.firstItem
        const categoryKey = sceneMeta?.categoryKey ?? null

        if (!firstItem) {
          return []
        }

        if (categoryKey === null) {
          return [{ ...scene, category: sceneCategory, groups }]
        }

        return [
          {
            ...scene,
            id: `${scene.id}--${firstItem.id}`,
            label: firstItem.label,
            description: firstItem.description,
            category: appNavCategoryByKey[categoryKey] ?? categoryKey,
            icon: firstItem.icon,
            defaultTo: firstItem.to,
            groups,
          },
        ]
      },
    )
  })
  const preferredSceneOrder = new Map([['domain-project--project-list', 0]])
  const sceneIdsByCategory = new Map<string, Array<string>>()

  for (const scene of scenes) {
    const sceneIds = sceneIdsByCategory.get(scene.category)

    if (sceneIds) {
      sceneIds.push(scene.id)
      continue
    }

    sceneIdsByCategory.set(scene.category, [scene.id])
  }

  for (const sceneIds of sceneIdsByCategory.values()) {
    sceneIds.sort((leftId, rightId) => {
      const leftOrder = preferredSceneOrder.get(leftId)
      const rightOrder = preferredSceneOrder.get(rightId)

      if (leftOrder === undefined && rightOrder === undefined) {
        return 0
      }

      return (
        (leftOrder ?? Number.MAX_SAFE_INTEGER) -
        (rightOrder ?? Number.MAX_SAFE_INTEGER)
      )
    })
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
    defaultSceneId: scenes.some((scene) => scene.id === config.defaultSceneId)
      ? config.defaultSceneId
      : (scenes[0]?.id ?? ''),
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

  const config = groupAppNavConfig(
    splitUicEnterpriseManagementScene(
      registration?.createNavConfig(options) ??
        createAppNavConfig(webDomains, options),
    ),
    options,
  )
  const homeTo = registration?.homeTo ?? DEFAULT_APP_HOME_TO
  const homeScene = config.scenes.find((scene) =>
    scene.groups.some((group) =>
      group.items.some((item) => item.to === homeTo),
    ),
  )

  return homeScene
    ? { ...config, defaultSceneId: homeScene.id }
    : config
}

export function resolveAppEditionHomeTo(
  webDomains: ReadonlyArray<WebDomain>,
  appEdition = DEFAULT_APP_EDITION,
) {
  return (
    resolveAppEditionRegistration<AppNavConfigOptions, AppNavConfig>(
      webDomains,
      appEdition,
    )?.homeTo ?? DEFAULT_APP_HOME_TO
  )
}
