import { describe, expect, it } from "vitest"
import { Building2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { WebDomain } from "@carbonnt-cyacle/web-base"
import { webDomain as accountingWebDomain } from "@carbonnt-cyacle/web-accounting"
import { webDomain as carbonReductionWebDomain } from "@carbonnt-cyacle/web-carbon-reduction"
import { webDomain as cfoWebDomain } from "@carbonnt-cyacle/web-cfo"
import { webDomain as materialWebDomain } from "@carbonnt-cyacle/web-material"
import { webDomain as pcfFactorApiWebDomain } from "@carbonnt-cyacle/web-pcf-factor-api"
import { webDomain as projectWebDomain } from "@carbonnt-cyacle/web-project"
import { webDomain as supplyChainWebDomain } from "@carbonnt-cyacle/web-supply-chain"
import { webDomain as uicWebDomain } from "@carbonnt-cyacle/web-uic"
import { webDomain as workSupervisionWebDomain } from "@carbonnt-cyacle/web-work-supervision"

import { createConfiguredAppNavConfig } from "./app-nav-config.ts"

const TestIcon = (() => null) as unknown as LucideIcon

function createDomain({
  id,
  itemId,
  category,
  sceneId,
  to = `/${id}`,
}: {
  id: string
  itemId: string
  category?: string
  sceneId?: string
  to?: string
}): WebDomain {
  return {
    id,
    routes: [],
    capabilities: {
      nav: () => ({
        id: sceneId ?? `domain-${id}`,
        label: id,
        desc: `${id} scene`,
        icon: TestIcon,
        defaultTo: to,
        groups: [
          {
            id: `${id}-group`,
            title: null,
            items: [
              {
                id: itemId,
                label: itemId,
                desc: `${itemId} item`,
                to,
                icon: TestIcon,
                category,
              },
            ],
          },
        ],
      }),
    },
  }
}

function createOrganizationWorkspace(organizationCategory: string) {
  return {
    id: "workspace-1",
    scope: "workspace-scope-1",
    name: "Workspace",
    belongType: "ORGANIZATION",
    organizationCategory,
  }
}

function createStandaloneAccountingDomain(): WebDomain {
  return {
    id: "accounting",
    routes: [],
    capabilities: {
      nav: () => ({
        id: "domain-accounting",
        label: "Accounting",
        desc: "Accounting",
        icon: TestIcon,
        defaultTo: "/cfp",
        groups: [
          {
            id: "accounting-main",
            title: null,
            items: [
              {
                id: "cfp",
                label: "CFP",
                desc: "CFP",
                to: "/cfp",
                icon: TestIcon,
                category: "accounting",
                standaloneScene: true,
              },
              {
                id: "lca",
                label: "LCA",
                desc: "LCA",
                to: "/lca",
                icon: TestIcon,
                category: "accounting",
                standaloneScene: true,
              },
            ],
          },
        ],
      }),
    },
  }
}

describe("configured app navigation", () => {
  it("filters the scene picker without removing the underlying routes", () => {
    const config = createConfiguredAppNavConfig(
      [
        createDomain({
          id: "pcf.factor.api",
          itemId: "background-data",
          sceneId: "domain-pcf-factor-api",
        }),
        createDomain({ id: "cfo", itemId: "organization-carbon-footprint" }),
        createDomain({
          id: "project",
          itemId: "service-customers",
          to: "/project/research-objects",
        }),
        createDomain({ id: "uic", itemId: "user-center" }),
      ],
      {
        language: "zh-CN",
        visibleSceneIds: ["domain-pcf-factor-api", "domain-cfo", "domain-uic"],
      },
    )

    expect(config.scenes.map((scene) => scene.id)).toEqual([
      "domain-pcf-factor-api",
      "domain-cfo",
      "domain-uic",
    ])
    expect(config.categories.flatMap((category) => category.sceneIds)).toEqual([
      "domain-pcf-factor-api",
      "domain-cfo",
      "domain-uic",
    ])
    expect(config.defaultSceneId).toBe("domain-pcf-factor-api")
  })

  it("keeps a fallback scene while permissions are still unavailable", () => {
    const config = createConfiguredAppNavConfig(
      [
        createDomain({
          id: "project",
          itemId: "project-list",
          to: "/project/projects",
        }),
      ],
      {
        language: "zh-CN",
        visibleSceneIds: ["domain-cfo"],
      },
    )

    expect(config.scenes.map((scene) => scene.id)).toEqual(["domain-project"])
    expect(config.defaultSceneId).toBe("domain-project")
    expect(config.categories).toEqual([])
  })

  it("splits enterprise management from the user center scene", () => {
    const uicDomain: WebDomain = {
      id: "uic",
      routes: [],
      capabilities: {
        nav: () => ({
          id: "domain-uic",
          label: "User Center",
          desc: "Account and enterprise settings",
          icon: TestIcon,
          defaultTo: "/uic/user/profile",
          groups: [
            {
              id: "uic-user-settings",
              title: "User Center",
              items: [
                {
                  id: "uic-user-profile",
                  label: "Basic Info",
                  desc: "Basic Info",
                  to: "/uic/user/profile",
                  icon: TestIcon,
                },
              ],
            },
            {
              id: "uic-enterprise-management",
              title: "Enterprise Management",
              items: [
                {
                  id: "uic-org-enterprise-info",
                  label: "Enterprise Info",
                  desc: "Enterprise Info",
                  to: "/uic/org/enterprise-info",
                  icon: TestIcon,
                },
              ],
            },
          ],
        }),
      },
    }
    const config = createConfiguredAppNavConfig([uicDomain], {
      language: "en-US",
    })

    expect(config.scenes.map((scene) => scene.id)).toEqual([
      "domain-uic",
      "domain-uic-enterprise-management",
    ])
    expect(config.scenes[0]?.groups.map((group) => group.id)).toEqual(["uic-user-settings"])
    expect(config.scenes[1]).toMatchObject({
      label: "Enterprise Management",
      description: "Enterprise Info",
      icon: Building2,
      defaultTo: "/uic/org/enterprise-info",
      groups: [{ id: "uic-enterprise-management", title: null }],
    })
    expect(config.categories.find((category) => category.title === "Account")?.sceneIds).toEqual([
      "domain-uic",
      "domain-uic-enterprise-management",
    ])
  })

  it("moves item-level scenes to their category without replacing the original domain scene", () => {
    const projectDomain: WebDomain = {
      id: "project",
      routes: [],
      capabilities: {
        nav: () => ({
          id: "domain-project",
          label: "Research Objects",
          desc: "Research object scene",
          icon: TestIcon,
          defaultTo: "/project/research-objects",
          groups: [
            {
              id: "project-main",
              title: null,
              items: [
                {
                  id: "project-list",
                  label: "Projects",
                  desc: "Project list",
                  to: "/project/projects",
                  icon: TestIcon,
                  category: "accounting",
                },
                {
                  id: "project-research-objects",
                  label: "Research Objects",
                  desc: "Research objects",
                  to: "/project/research-objects",
                  icon: TestIcon,
                },
              ],
            },
          ],
        }),
      },
    }
    const config = createConfiguredAppNavConfig(
      [projectDomain, createDomain({ id: "accounting", itemId: "accounting-list" })],
      { language: "en-US" },
    )
    const projectScene = config.scenes.find((scene) => scene.id === "domain-project")
    const projectListScene = config.scenes.find(
      (scene) => scene.id === "domain-project--project-list",
    )
    const accountingCategory = config.categories.find((category) =>
      category.sceneIds.includes("domain-accounting"),
    )

    expect(projectScene?.groups[0]?.items.map((item) => item.id)).toEqual([
      "project-research-objects",
    ])
    expect(projectListScene).toMatchObject({
      label: "Projects",
      defaultTo: "/project/projects",
    })
    expect(accountingCategory?.sceneIds[0]).toBe("domain-project--project-list")
  })

  it("uses the categorized scene when no uncategorized item remains visible", () => {
    const config = createConfiguredAppNavConfig(
      [
        createDomain({
          id: "project",
          itemId: "project-list",
          category: "accounting",
        }),
      ],
      { language: "en-US" },
    )

    expect(config.scenes.map((scene) => scene.id)).toEqual(["domain-project--project-list"])
    expect(config.defaultSceneId).toBe("domain-project--project-list")
  })

  it("keeps the project list as the default scene while permissions reveal earlier domains", () => {
    const config = createConfiguredAppNavConfig(
      [
        createStandaloneAccountingDomain(),
        createDomain({
          id: "project",
          itemId: "project-list",
          category: "accounting",
          to: "/project/projects",
        }),
      ],
      { language: "en-US" },
    )

    expect(config.scenes[0]?.defaultTo).toBe("/cfp")
    expect(config.defaultSceneId).toBe("domain-project--project-list")
  })

  it("promotes standalone items to sibling scenes", () => {
    const config = createConfiguredAppNavConfig([createStandaloneAccountingDomain()], {
      language: "en-US",
    })

    expect(config.scenes.map((scene) => [scene.label, scene.defaultTo])).toEqual([
      ["CFP", "/cfp"],
      ["LCA", "/lca"],
    ])
  })

  it("groups CBAM into accounting and carbon assets, national carbon market into management", () => {
    const config = createConfiguredAppNavConfig(
      [
        createDomain({
          id: "carbon.assets",
          itemId: "carbon-assets-ledger-asset",
          sceneId: "domain-carbon-assets",
        }),
        createDomain({
          id: "cbam",
          itemId: "cbam-projects",
          sceneId: "domain-cbam",
        }),
        createDomain({
          id: "market.carbon",
          itemId: "ncmr-dashboard",
          sceneId: "domain-market-carbon",
        }),
      ],
      {
        language: "zh-CN",
        workspace: createOrganizationWorkspace("ENTERPRISE_CUSTOMER"),
      },
    )

    expect(config.categories.map((category) => category.title)).toEqual([
      "核算",
      "管理",
    ])
    expect(config.categories[0]?.sceneIds).toEqual(["domain-cbam"])
    // 分组内顺序由 APP_NAV_SCENE_ORDER 决定，而非 webModules 注册顺序。
    expect(config.categories[1]?.sceneIds).toEqual([
      "domain-market-carbon",
      "domain-carbon-assets",
    ])
  })

  it("keeps the business unit entry above survey management in the foundation group", () => {
    const config = createConfiguredAppNavConfig(
      [
        createDomain({
          id: "supply.chain",
          itemId: "survey-operations",
          sceneId: "domain-supply-chain",
        }),
        createDomain({
          id: "project",
          itemId: "project-research-objects",
          sceneId: "domain-project",
        }),
        createDomain({
          id: "pcf.factor.api",
          itemId: "background-data",
          sceneId: "domain-pcf-factor-api",
        }),
      ],
      { language: "zh-CN" },
    )

    expect(
      config.categories.find((category) => category.title === "基础")?.sceneIds,
    ).toEqual(["domain-pcf-factor-api", "domain-project", "domain-supply-chain"])
  })

  it("orders every entry card by the configured foundation/accounting/management/account layout", () => {
    // 真实领域：验证「基础 → 核算 → 管理 → 账号」四组卡片的组成与顺序。
    // 工作督办、CBAM合规、全国碳市场填报、碳资产管理尚未接入（无 nav capability），
    // 接入后分别落在 基础首位 / 核算末位 / 管理第三位 / 管理第四位。
    const config = createConfiguredAppNavConfig(
      [
        supplyChainWebDomain,
        projectWebDomain,
        accountingWebDomain,
        cfoWebDomain,
        pcfFactorApiWebDomain,
        materialWebDomain,
        carbonReductionWebDomain,
        uicWebDomain,
      ],
      {
        language: "zh-CN",
        workspace: createOrganizationWorkspace("ENTERPRISE_CUSTOMER"),
      },
    )

    expect(config.categories.map((category) => [category.title, category.sceneIds])).toEqual([
      [
        "基础",
        [
          "domain-pcf-factor-api",
          "domain-project",
          "domain-supply-chain",
          "domain-material",
          "domain-material--collection",
        ],
      ],
      [
        "核算",
        [
          "domain-project--project-list",
          "domain-accounting--accounting-cfp-accounting-tasks",
          "domain-accounting--accounting-lca-accounting-tasks",
          "domain-cfo",
        ],
      ],
      [
        "管理",
        [
          "domain-supply-chain--supplier-carbon-management",
          "domain-carbon-reduction",
          "domain-accounting--carbon-verification-accounting-support",
        ],
      ],
      ["账号", ["domain-uic", "domain-uic-enterprise-management"]],
    ])
    // 侧栏分组标题即一级菜单，物料/活动管理卡片内是两个一级分组。
    const materialScene = config.scenes.find((scene) => scene.id === "domain-material")
    expect(materialScene?.groups.map((group) => group.title)).toEqual([
      "物料管理",
      "活动管理",
    ])
  })

  it("keeps materials and activities in one card and promotes collection to its own card", () => {
    const materialDomain: WebDomain = {
      id: "material",
      routes: [],
      capabilities: {
        nav: () => ({
          id: "domain-material",
          label: "物料/活动管理",
          desc: "维护物料与活动的类型、分组和记录",
          icon: TestIcon,
          defaultTo: "/material/materials/types",
          groups: [
            {
              id: "material-master",
              title: "物料管理",
              items: [
                {
                  id: "material-types",
                  label: "物料类型",
                  desc: "物料类型",
                  to: "/material/materials/types",
                  icon: TestIcon,
                },
                {
                  id: "material-groups",
                  label: "物料组",
                  desc: "物料组",
                  to: "/material/materials/groups",
                  icon: TestIcon,
                },
                {
                  id: "material-items",
                  label: "物料",
                  desc: "物料",
                  to: "/material/materials/items",
                  icon: TestIcon,
                },
                {
                  id: "material-records",
                  label: "物料记录",
                  desc: "物料记录",
                  to: "/material/materials/records",
                  icon: TestIcon,
                },
              ],
            },
            {
              id: "activity",
              title: "活动管理",
              items: [
                {
                  id: "activity-types",
                  label: "活动类型",
                  desc: "活动类型",
                  to: "/material/activities/types",
                  icon: TestIcon,
                },
                {
                  id: "activity-groups",
                  label: "活动组",
                  desc: "活动组",
                  to: "/material/activities/groups",
                  icon: TestIcon,
                },
                {
                  id: "activity-items",
                  label: "活动",
                  desc: "活动",
                  to: "/material/activities/items",
                  icon: TestIcon,
                },
                {
                  id: "activity-records",
                  label: "活动记录",
                  desc: "活动记录",
                  to: "/material/activities/records",
                  icon: TestIcon,
                },
              ],
            },
            {
              id: "collection",
              title: "数据收集",
              items: [
                {
                  id: "collection-tasks",
                  label: "收集任务管理",
                  desc: "收集任务管理",
                  to: "/material/collection/tasks",
                  icon: TestIcon,
                },
              ],
            },
          ],
        }),
      },
    }
    const config = createConfiguredAppNavConfig([materialDomain], {
      language: "zh-CN",
      workspace: createOrganizationWorkspace("ENTERPRISE_CUSTOMER"),
    })

    // 物料/活动管理是一张卡（侧栏里两个一级分组），数据收集是另一张卡。
    expect(config.scenes.map((scene) => scene.id)).toEqual([
      "domain-material",
      "domain-material--collection",
    ])
    expect(config.scenes[0]).toMatchObject({
      label: "物料/活动管理",
      description: "维护物料与活动的类型、分组和记录",
      defaultTo: "/material/materials/types",
      category: "基础",
    })
    expect(
      config.scenes[0]?.groups.map((group) => [group.title, group.items.length]),
    ).toEqual([
      ["物料管理", 4],
      ["活动管理", 4],
    ])
    expect(config.scenes[1]).toMatchObject({
      label: "数据收集",
      description: "发起收集并跟踪回收进度",
      defaultTo: "/material/collection/tasks",
      category: "基础",
    })
    expect(config.categories.find((category) => category.title === "基础")?.sceneIds).toEqual([
      "domain-material",
      "domain-material--collection",
    ])
  })

  it("groups carbon reduction management into management after carbon assets", () => {
    const config = createConfiguredAppNavConfig(
      [
        createDomain({
          id: "carbon.reduction",
          itemId: "carbon-reduction-targets",
          sceneId: "domain-carbon-reduction",
          to: "/carbon-reduction/targets",
        }),
        createDomain({
          id: "carbon.assets",
          itemId: "carbon-assets-ledger-asset",
          sceneId: "domain-carbon-assets",
        }),
      ],
      {
        language: "zh-CN",
        workspace: createOrganizationWorkspace("ENTERPRISE_CUSTOMER"),
      },
    )

    expect(config.categories.map((category) => category.title)).toEqual(["管理"])
    expect(config.categories[0]?.sceneIds).toEqual([
      "domain-carbon-assets",
      "domain-carbon-reduction",
    ])
  })

  it("hides the management group for non-enterprise-customer organizations", () => {
    const config = createConfiguredAppNavConfig(
      [
        createDomain({
          id: "carbon.assets",
          itemId: "carbon-assets-ledger-asset",
          sceneId: "domain-carbon-assets",
        }),
        createDomain({
          id: "project",
          itemId: "project-research-objects",
          sceneId: "domain-project",
        }),
      ],
      {
        language: "zh-CN",
        workspace: createOrganizationWorkspace("SERVICE_PROVIDER"),
      },
    )

    expect(config.scenes.map((scene) => scene.id)).toEqual(["domain-project"])
    expect(config.categories.map((category) => category.title)).toEqual(["基础"])
  })

  it("hides the management group for personal workspaces", () => {
    const config = createConfiguredAppNavConfig(
      [
        createDomain({
          id: "carbon.assets",
          itemId: "carbon-assets-ledger-asset",
          sceneId: "domain-carbon-assets",
        }),
        createDomain({
          id: "project",
          itemId: "project-research-objects",
          sceneId: "domain-project",
        }),
      ],
      {
        language: "zh-CN",
        workspace: {
          id: "workspace-1",
          scope: "workspace-scope-1",
          name: "Workspace",
          belongType: "PERSIONAL",
        },
      },
    )

    expect(config.categories.map((category) => category.title)).toEqual(["基础"])
  })

  it("hides the management group before an organization workspace loads", () => {
    const config = createConfiguredAppNavConfig(
      [
        createDomain({
          id: "carbon.assets",
          itemId: "carbon-assets-ledger-asset",
          sceneId: "domain-carbon-assets",
        }),
        createDomain({
          id: "project",
          itemId: "project-research-objects",
          sceneId: "domain-project",
        }),
      ],
      { language: "zh-CN" },
    )

    expect(config.scenes.map((scene) => scene.id)).toEqual(["domain-project"])
    expect(config.categories.map((category) => category.title)).toEqual(["基础"])
  })

  it("keeps the management group for enterprise customer organizations", () => {
    const config = createConfiguredAppNavConfig(
      [
        createDomain({
          id: "carbon.assets",
          itemId: "carbon-assets-ledger-asset",
          sceneId: "domain-carbon-assets",
        }),
        createDomain({
          id: "project",
          itemId: "project-research-objects",
          sceneId: "domain-project",
        }),
      ],
      {
        language: "zh-CN",
        workspace: createOrganizationWorkspace("ENTERPRISE_CUSTOMER"),
      },
    )

    expect(config.categories.map((category) => category.title)).toEqual([
      "基础",
      "管理",
    ])
  })

  it("puts the work supervision entry at the top of the foundation group", () => {
    // 回归：work.supervision 的 nav 把 5 个菜单都标了 category: "management"，场景因此
    // 被拆成 `domain-work-supervision--work-supervision-home`。app 层必须用这个带后缀的 id
    // 才能把它从「管理」改判到「基础」；只登记不带后缀的 id 会命中不了，卡片掉进管理列末尾
    // （dev 上已经踩过）。这里用同名 stub 场景占位校验顺序，模块接入后由下面的真实模块用例接管。
    const config = createConfiguredAppNavConfig(
      [
        createDomain({
          id: "work.supervision",
          itemId: "work-supervision-home",
          sceneId: "domain-work-supervision",
          to: "/work-supervision",
        }),
        pcfFactorApiWebDomain,
      ],
      {
        language: "zh-CN",
        workspace: createOrganizationWorkspace("ENTERPRISE_CUSTOMER"),
      },
    )

    expect(config.categories.find((category) => category.title === "基础")?.sceneIds).toEqual([
      "domain-work-supervision",
      "domain-pcf-factor-api",
    ])
  })

  it("moves the split work supervision scene (all items marked management) into the foundation group", () => {
    // 真实模块形态：分组内 5 个菜单都带 category: "management"，于是场景被拆成
    // `domain-work-supervision--work-supervision-home`，模块自身声明的分类是「管理」。
    const workSupervisionDomain: WebDomain = {
      id: "work.supervision",
      routes: [],
      capabilities: {
        nav: () => ({
          id: "domain-work-supervision",
          label: "工作台",
          desc: "集中查看待处理事项、快捷入口与临期事项",
          icon: TestIcon,
          defaultTo: "/work-supervision",
          groups: [
            {
              id: "work-supervision-workbench",
              title: "工作台",
              items: [
                {
                  id: "work-supervision-home",
                  label: "工作督办",
                  desc: "集中查看待处理事项、快捷入口与临期事项",
                  to: "/work-supervision",
                  icon: TestIcon,
                  category: "management",
                },
                {
                  id: "work-supervision-tasks",
                  label: "管理事项",
                  desc: "管理事项",
                  to: "/work-supervision/tasks",
                  icon: TestIcon,
                  category: "management",
                },
              ],
            },
          ],
        }),
      },
    }
    const config = createConfiguredAppNavConfig([workSupervisionDomain, pcfFactorApiWebDomain], {
      language: "zh-CN",
      workspace: createOrganizationWorkspace("ENTERPRISE_CUSTOMER"),
    })

    expect(config.categories.find((category) => category.title === "基础")?.sceneIds).toEqual([
      "domain-work-supervision--work-supervision-home",
      "domain-pcf-factor-api",
    ])
    expect(
      config.categories.find((category) => category.title === "管理")?.sceneIds ?? [],
    ).not.toContain("domain-work-supervision--work-supervision-home")
  })

  describe("with the real work.supervision module wired in", () => {
    // 模块接入后（web-work-supervision 带 nav capability）自动启用这组校验；
    // 当前仓库里它还是无 nav 的占位包，所以跳过而不是失败。
    const workSupervisionScenes = createConfiguredAppNavConfig([workSupervisionWebDomain], {
      language: "zh-CN",
      workspace: createOrganizationWorkspace("ENTERPRISE_CUSTOMER"),
    }).scenes
    const hasWorkSupervisionNav = workSupervisionScenes.length > 0

    it.runIf(hasWorkSupervisionNav)("lands in 基础 as the first card", () => {
      const config = createConfiguredAppNavConfig(
        [workSupervisionWebDomain, pcfFactorApiWebDomain],
        {
          language: "zh-CN",
          workspace: createOrganizationWorkspace("ENTERPRISE_CUSTOMER"),
        },
      )
      const foundationSceneIds =
        config.categories.find((category) => category.title === "基础")?.sceneIds ?? []

      expect(foundationSceneIds).toEqual([
        "domain-work-supervision--work-supervision-home",
        "domain-pcf-factor-api",
      ])
      expect(
        config.categories.find((category) => category.title === "管理")?.sceneIds ?? [],
      ).not.toContain("domain-work-supervision--work-supervision-home")
    })
  })
})
