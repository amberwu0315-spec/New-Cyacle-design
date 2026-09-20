import { describe, expect, it } from "vitest"
import { Building2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { WebDomain } from "@carbonnt-cyacle/web-base"

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

  it("groups carbon assets, CBAM and national carbon market filing into new categories", () => {
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
      { language: "zh-CN" },
    )

    expect(config.categories.map((category) => category.title)).toEqual([
      "资产与履约",
      "填报",
    ])
    expect(config.categories[0]?.sceneIds).toEqual([
      "domain-carbon-assets",
      "domain-cbam",
    ])
    expect(config.categories[1]?.sceneIds).toEqual(["domain-market-carbon"])
  })

  it("splits material into materials/activities/collection sibling scenes", () => {
    const materialDomain: WebDomain = {
      id: "material",
      routes: [],
      capabilities: {
        nav: () => ({
          id: "domain-material",
          label: "物料管理",
          desc: "物料类型、物料组和物料记录",
          icon: TestIcon,
          defaultTo: "/material/materials/types",
          groups: [
            {
              id: "material-master",
              title: null,
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
    })

    expect(config.scenes.map((scene) => scene.id)).toEqual([
      "domain-material",
      "domain-material--activity",
      "domain-material--collection",
    ])
    expect(config.scenes[0]?.groups[0]?.items.map((item) => item.id)).toEqual([
      "material-types",
      "material-groups",
      "material-items",
      "material-records",
    ])
    expect(config.scenes[1]).toMatchObject({
      label: "活动管理",
      description: "活动类型、活动组、活动和活动记录",
      defaultTo: "/material/activities/types",
    })
    expect(config.scenes[2]).toMatchObject({
      label: "数据收集",
      description: "发起收集并跟踪回收进度",
      defaultTo: "/material/collection/tasks",
    })
  })
})
