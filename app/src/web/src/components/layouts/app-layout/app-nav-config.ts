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

const ENTERPRISE_CUSTOMER_ORGANIZATION_CATEGORY = "ENTERPRISE_CUSTOMER"

function isEnterpriseCustomerWorkspace(
  workspace: AppNavConfigOptions["workspace"],
): boolean {
  return (
    workspace?.belongType === "ORGANIZATION" &&
    workspace.organizationCategory === ENTERPRISE_CUSTOMER_ORGANIZATION_CATEGORY
  )
}

/**
 * 企业客户专属入口：分类仍留在「基础」，但非企业客户组织、个人工作空间和
 * 组织类型尚未加载时一律不渲染。
 *
 * 与 `filterManagementCategoryByOrganizationType` 的「管理」分类折叠分开表达：
 * 分类表达的是菜单归属，不是可见性；把企业专属写成「挪进管理分类」会让
 * 后续调整分类的人无意间改掉权限（物料/活动管理就这样漏过企业门禁）。
 *
 * 「数据收集」（`domain-material--collection`）不在此列：它的菜单按
 * manager/reporter/approver 权限可见，填报人和审批人可能是非企业用户。
 */
const ENTERPRISE_ONLY_SCENE_IDS = ["domain-material"] as const

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
    assetsCompliance: t.layout.navCategories.assetsCompliance,
    filing: t.layout.navCategories.filing,
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
  collection: { description: "发起收集并跟踪回收进度" },
}

/**
 * material 领域只有一个 nav capability，场景内声明了「物料管理 / 活动管理 / 数据收集」
 * 三组入口。物料与活动同属「物料/活动管理」一张卡片（侧栏里是它的两个一级菜单），
 * 只有「数据收集」需要提升为独立的同级 scene。
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

/**
 * 入口菜单在每个分组内的展示顺序（按 scene id）。
 * 数组下标即顺序；未列出的 scene 稳定排在所属分组末尾（保留 webModules 注册顺序）。
 *
 * 注意：新接入的 domain 需要在本表登记插入顺序位置，并在 appNavSceneCategoryById
 * 中登记所属分组，否则会落到默认「业务应用」分组末尾。
 * 被 domain 分类拆出来的 scene id 形如 `<scene id>--<该分组第一个菜单 id>`，登记时
 * 必须用拆分后的 id（例如产品碳足迹是 `domain-accounting--accounting-cfp-accounting-tasks`，
 * 生命周期评价是 `domain-accounting--accounting-lca-accounting-tasks`）。
 * 判断方法：domain 的 nav 里只要给条目标了 `category`，场景就会被拆、id 就带后缀；
 * 标成别的分类（如 management）但希望卡片落在基础/核算时，app 层必须用带后缀的 id 覆盖。
 *
 * 暂未接入的模块（其 web domain 尚未提供 nav capability，卡片不会出现）：
 * CBAM合规、全国碳市场填报、碳资产管理。
 */
const APP_NAV_SCENE_ORDER = [
  // 基础
  // 工作督办：模块自身把 5 个菜单都标了 category: "management"，所以会被拆成
  // `<scene id>--<首个菜单 id>` 的场景，这里必须用拆分后的 id 才能命中；
  // 不带后缀的写法一并登记，模块改写法也不会掉到分组末尾。
  "domain-work-supervision--work-supervision-home",
  "domain-work-supervision",
  "domain-pcf-factor-api", // 背景数据
  "domain-project", // 业务单元 / 服务客户 / 研究对象（标签随 workspace 组织类型变化）
  "domain-supply-chain", // 问卷管理（按组织类型可见）
  "domain-material", // 物料/活动管理
  "domain-material--collection", // 数据收集
  // 核算
  "domain-project--project-list", // 项目列表
  "domain-accounting--accounting-cfp-accounting-tasks", // 产品碳足迹（含建模规则子项）
  "domain-accounting--accounting-lca-accounting-tasks", // 生命周期评价
  "domain-cfo", // 组织碳足迹
  "domain-cbam", // CBAM合规（未接入）
  // 管理
  "domain-supply-chain--supplier-carbon-management", // 供应链碳管理（企业客户可见）
  "domain-market-carbon", // 全国碳市场填报（未接入）
  "domain-carbon-assets", // 碳资产管理（未接入）
  "domain-carbon-reduction", // 碳减排管理
  "domain-accounting--carbon-verification-accounting-support", // 碳核查支撑（企业客户可见）
  // 账号
  "domain-uic", // 用户中心
  "domain-uic-enterprise-management", // 企业管理
] as const

function groupAppNavConfig(config: AppNavConfig, options: AppNavConfigOptions = {}): AppNavConfig {
  type AppScene = AppNavConfig["scenes"][number]
  const appNavCategories = getAppNavCategories(options.language)
  // 分组展示顺序：基础 → 核算 → 管理 → 账号。
  // assetsCompliance / filing / dashboard / platform 当前已无 scene 归入（碳资产管理、
  // 全国碳市场填报已并入管理），保留占位以便后续有 scene 复用时仍排在账号分组之前。
  const appNavCategoryOrder = [
    appNavCategories.basis,
    appNavCategories.accounting,
    appNavCategories.assetsCompliance,
    appNavCategories.filing,
    appNavCategories.management,
    appNavCategories.dashboard,
    appNavCategories.platform,
    appNavCategories.account,
  ]
  const appNavSceneCategoryById: Record<string, string> = {
    // 工作督办：模块把 5 个菜单都标了 category: "management"，场景会被拆成
    // `domain-work-supervision--work-supervision-home`；拆分场景的 id 也要在这里登记，
    // 否则会回落到模块自己声明的「管理」。不带后缀的写法一并登记，模块改写法也不会掉。
    "domain-work-supervision": appNavCategories.basis,
    "domain-work-supervision--work-supervision-home": appNavCategories.basis,
    "domain-project": appNavCategories.basis,
    "domain-pcf-factor-api": appNavCategories.basis,
    "domain-supply-chain": appNavCategories.basis,
    "domain-material": appNavCategories.basis,
    "domain-material--collection": appNavCategories.basis,
    "domain-accounting": appNavCategories.accounting,
    "domain-cfo": appNavCategories.accounting,
    "domain-cbam": appNavCategories.accounting, // 待接入
    "domain-supply-chain--supplier-carbon-management": appNavCategories.management,
    "domain-carbon-assets": appNavCategories.management, // 待接入
    "domain-carbon-reduction": appNavCategories.management,
    "domain-market-carbon": appNavCategories.management, // 待接入
    "domain-accounting--carbon-verification-accounting-support": appNavCategories.management,
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

      // 拆分出来的场景 id 是 `<原 scene id>--<首个菜单 id>`。域自己声明的 category 只是
      // 「归属建议」，app 层的 appNavSceneCategoryById 必须能整体改判（例如工作督办的菜单
      // 都标了 management，但产品要求这张卡放在「基础」），否则模块自带分类会让覆盖表失效。
      const splitSceneId = `${scene.id}--${firstItem.id}`

      return [
        {
          ...scene,
          id: splitSceneId,
          label: firstItem.label,
          description: firstItem.description,
          category: appNavSceneCategoryById[splitSceneId] ?? appNavCategoryByKey[categoryKey] ?? categoryKey,
          icon: firstItem.icon,
          defaultTo: firstItem.to,
          groups,
        },
      ]
    })
  })
  const preferredSceneOrder = new Map(
    APP_NAV_SCENE_ORDER.map((sceneId, index) => [sceneId as string, index]),
  )
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

/**
 * 「管理」分组仅对企业客户组织可见。其它组织类型、个人工作空间或组织类型
 * 尚未加载时，隐藏整个分组及其入口卡片；底层路由仍保持注册。
 */
function filterManagementCategoryByOrganizationType(
  config: AppNavConfig,
  options: AppNavConfigOptions = {},
): AppNavConfig {
  if (isEnterpriseCustomerWorkspace(options.workspace)) {
    return config
  }

  const managementTitle = getAppNavCategories(options.language).management
  const scenes = config.scenes.filter((scene) => scene.category !== managementTitle)
  const categories = config.categories.filter(
    (category) => category.title !== managementTitle,
  )

  return {
    ...config,
    scenes,
    categories,
    defaultSceneId: scenes.some((scene) => scene.id === config.defaultSceneId)
      ? config.defaultSceneId
      : (scenes[0]?.id ?? ""),
  }
}

/**
 * 移除企业客户专属入口。分类保持原样（例如物料/活动管理仍在「基础」），
 * 只按工作空间类型决定是否出现在导航里。
 */
function filterEnterpriseOnlyScenes(
  config: AppNavConfig,
  options: AppNavConfigOptions = {},
): AppNavConfig {
  if (isEnterpriseCustomerWorkspace(options.workspace)) {
    return config
  }

  const hiddenIds = new Set<string>(ENTERPRISE_ONLY_SCENE_IDS)
  const scenes = config.scenes.filter((scene) => !hiddenIds.has(scene.id))
  if (scenes.length === config.scenes.length) {
    return config
  }

  return {
    ...config,
    scenes,
    categories: config.categories
      .map((category) => ({
        ...category,
        sceneIds: category.sceneIds.filter((sceneId) => !hiddenIds.has(sceneId)),
      }))
      .filter((category) => category.sceneIds.length > 0),
    defaultSceneId: hiddenIds.has(config.defaultSceneId)
      ? (scenes[0]?.id ?? "")
      : config.defaultSceneId,
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
    filterEnterpriseOnlyScenes(
      filterManagementCategoryByOrganizationType(
        groupAppNavConfig(
          splitMaterialModuleScenes(
            splitUicEnterpriseManagementScene(
              registration?.createNavConfig(options) ?? createAppNavConfig(webDomains, options),
            ),
          ),
          options,
        ),
        options,
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
