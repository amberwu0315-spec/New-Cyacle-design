import {
  createAppNavConfig,
  type AppNavConfig,
  type AppNavConfigOptions,
  type WebDomain,
} from "@carbonnt-cyacle/web-base"
import { Building2 } from "lucide-react"

import { DEFAULT_APP_EDITION, resolveAppEditionRegistration } from "#/app-edition.ts"
import { getMessages } from "#/lib/i18n/index.ts"

export const DEFAULT_APP_HOME_TO = "/project/projects"

/**
 * Optional product-specific navigation presentation filter. The underlying
 * routes remain registered when a caller supplies visibleSceneIds.
 */
type ConfiguredAppNavConfigOptions = AppNavConfigOptions & {
  visibleSceneIds?: ReadonlyArray<string>
}

function getAppNavCategories(language: AppNavConfigOptions["language"]) {
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
  const uicSceneIndex = config.scenes.findIndex((scene) => scene.id === "domain-uic")
  const uicScene = config.scenes[uicSceneIndex]

  if (!uicScene) {
    return config
  }

  const enterpriseGroup = uicScene.groups.find((group) => group.id === "uic-enterprise-management")

  if (!enterpriseGroup?.items.length) {
    return config
  }

  const enterpriseDefaultTo = enterpriseGroup.items[0]?.to

  if (!enterpriseDefaultTo) {
    return config
  }

  const enterpriseScene = {
    ...uicScene,
    id: "domain-uic-enterprise-management",
    label: enterpriseGroup.title ?? enterpriseGroup.items[0]!.label,
    // This group becomes an independent scene card. Reuse its first item's
    // description instead of leaving the user-center scene summary in place.
    description: enterpriseGroup.items[0]!.description,
    icon: Building2,
    defaultTo: enterpriseDefaultTo,
    groups: [{ ...enterpriseGroup, title: null }],
  }
  const scenes = [...config.scenes]

  scenes.splice(
    uicSceneIndex,
    1,
    {
      ...uicScene,
      groups: uicScene.groups.filter((group) => group.id !== enterpriseGroup.id),
    },
    enterpriseScene,
  )

  return { ...config, scenes }
}

const MATERIAL_MODULE_SCENE_META: Record<string, { description: string }> = {
  activity: { description: "活动类型、活动组、活动和活动记录" },
  collection: { description: "发起收集并跟踪回收进度" },
}

/**
 * 把 material 领域里「物料管理 / 活动管理 / 数据收集」三组入口提升为并列的
 * scene，对齐 material-demo 的入口菜单结构。material 领域只有一个 nav
 * capability，因此三组先在一个 scene 里声明，再在这里拆成三个同级 scene。
 */
function splitMaterialModuleScenes(config: AppNavConfig): AppNavConfig {
  const materialSceneIndex = config.scenes.findIndex((scene) => scene.id === "domain-material")
  const materialScene = config.scenes[materialSceneIndex]

  if (!materialScene) {
    return config
  }

  const promoted = materialScene.groups
    .filter((group) => group.title !== null && MATERIAL_MODULE_SCENE_META[group.id])
    .map((group) => {
      const firstItem = group.items[0]
      const meta = MATERIAL_MODULE_SCENE_META[group.id]

      return {
        ...materialScene,
        id: `domain-material--${group.id}`,
        label: group.title!,
        description: meta.description,
        icon: firstItem?.icon ?? materialScene.icon,
        defaultTo: firstItem?.to ?? materialScene.defaultTo,
        groups: [{ ...group, title: null }],
      }
    })

  const remainingGroups = materialScene.groups.filter(
    (group) => !(group.title !== null && MATERIAL_MODULE_SCENE_META[group.id]),
  )
  const scenes = [...config.scenes]

  scenes.splice(materialSceneIndex, 1, { ...materialScene, groups: remainingGroups }, ...promoted)

  return { ...config, scenes }
}

function groupAppNavConfig(config: AppNavConfig, options: AppNavConfigOptions = {}): AppNavConfig {
  type AppScene = AppNavConfig["scenes"][number]
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
    "domain-project": appNavCategories.basis,
    "domain-pcf-factor-api": appNavCategories.basis,
    "domain-supply-chain": appNavCategories.basis,
    "domain-accounting": appNavCategories.accounting,
    "domain-cfo": appNavCategories.accounting,
    "domain-document-management": appNavCategories.management,
    "domain-uic": appNavCategories.account,
    "domain-uic-enterprise-management": appNavCategories.account,
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
    const groupsByCategory = new Map<string | null, AppScene["groups"]>()
    const sceneMetaByKey = new Map<
      string | null,
      {
        categoryKey: string | null
        firstItem: AppScene["groups"][number]["items"][number]
      }
    >()

    for (const group of scene.groups) {
      for (const item of group.items) {
        const categoryKey = item.category?.trim() || null
        const sceneKey = item.standaloneScene ? `${categoryKey ?? ""}::${item.id}` : categoryKey
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
    return Array.from(groupsByCategory.entries()).flatMap(([sceneKey, groups]) => {
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
    })
  })
  const preferredSceneOrder = new Map([["domain-project--project-list", 0]])
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

      return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER)
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
    if (handledCategoryTitles.has(category.title) || !sceneIdsByCategory.has(category.title)) {
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
      : (scenes[0]?.id ?? ""),
    categories: orderedCategoryTitles.map((title) => ({
      title,
      sceneIds: sceneIdsByCategory.get(title) ?? [],
    })),
  }
}

function filterAppNavScenes(
  config: AppNavConfig,
  visibleSceneIds?: ReadonlyArray<string>,
): AppNavConfig {
  if (!visibleSceneIds) {
    return config
  }

  const visibleIds = new Set(visibleSceneIds)
  // Keep the configured landing scene in the model so active-state and
  // breadcrumbs still resolve while omitting it from the scene picker cards.
  const landingScene = config.scenes.find((scene) =>
    scene.groups.some((group) => group.items.some((item) => item.to === DEFAULT_APP_HOME_TO)),
  )
  // During permission bootstrap every configured scene can be filtered out.
  // Keep one deterministic scene in the model so the shell still has an
  // active scene to render until the permission result arrives.
  const fallbackSceneId = config.defaultSceneId || config.scenes[0]?.id
  const scenes = config.scenes.filter(
    (scene) =>
      visibleIds.has(scene.id) || scene.id === landingScene?.id || scene.id === fallbackSceneId,
  )
  const categories = config.categories
    .map((category) => ({
      ...category,
      sceneIds: category.sceneIds.filter((sceneId) => visibleIds.has(sceneId)),
    }))
    .filter((category) => category.sceneIds.length > 0)

  return {
    ...config,
    scenes,
    categories,
    defaultSceneId: visibleIds.has(config.defaultSceneId)
      ? config.defaultSceneId
      : (scenes[0]?.id ?? ""),
  }
}

export function createConfiguredAppNavConfig(
  webDomains: ReadonlyArray<WebDomain>,
  options: ConfiguredAppNavConfigOptions = {},
  appEdition = DEFAULT_APP_EDITION,
): AppNavConfig {
  const registration = resolveAppEditionRegistration<AppNavConfigOptions, AppNavConfig>(
    webDomains,
    appEdition,
  )

  const config = filterAppNavScenes(
    groupAppNavConfig(
      splitMaterialModuleScenes(
        splitUicEnterpriseManagementScene(
          registration?.createNavConfig(options) ?? createAppNavConfig(webDomains, options),
        ),
      ),
      options,
    ),
    options.visibleSceneIds,
  )
  const homeTo = registration?.homeTo ?? DEFAULT_APP_HOME_TO
  const homeScene = config.scenes.find((scene) =>
    scene.groups.some((group) => group.items.some((item) => item.to === homeTo)),
  )

  return homeScene ? { ...config, defaultSceneId: homeScene.id } : config
}

export function resolveAppEditionHomeTo(
  webDomains: ReadonlyArray<WebDomain>,
  appEdition = DEFAULT_APP_EDITION,
) {
  return (
    resolveAppEditionRegistration<AppNavConfigOptions, AppNavConfig>(webDomains, appEdition)
      ?.homeTo ?? DEFAULT_APP_HOME_TO
  )
}
