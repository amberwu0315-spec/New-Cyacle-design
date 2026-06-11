import {
  Activity,
  BadgeCheck,
  Boxes,
  Braces,
  CalendarClock,
  Compass,
  GitBranch,
  Globe2,
  LayoutDashboard,
  PanelsTopLeft,
  Radio,
  RefreshCw,
  Server,
  SlidersHorizontal,
  Terminal,
  Users,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { DomainRouteTree } from '../../../routes/helpers/domain-route-tree'

export interface DomainNavMetaContext {
  locale: string
}

export interface DomainNavItemMeta {
  id: string
  label: string
  desc: string
  to: string
  icon: LucideIcon
}

export interface DomainNavGroupMeta {
  id: string
  title: string | null
  items: Array<DomainNavItemMeta>
}

export interface DomainNavMeta {
  id?: string
  label: string
  desc: string
  icon: LucideIcon
  defaultTo: string
  category?: string
  groups: Array<DomainNavGroupMeta>
}

export type DomainNavMetaFactory = (
  context: DomainNavMetaContext,
) => DomainNavMeta

export interface AppLayoutDomainMetas extends Record<string, unknown> {
  nav?: DomainNavMetaFactory
}

export interface AppNavItem {
  id: string
  label: string
  description: string
  to: string
  icon: LucideIcon
}

export interface AppNavGroup {
  id: string
  title: string | null
  items: Array<AppNavItem>
}

export interface AppScene {
  id: string
  label: string
  description: string
  category: string
  icon: LucideIcon
  defaultTo: string
  groups: Array<AppNavGroup>
}

export interface AppSceneCategory {
  title: string
  sceneIds: Array<string>
}

export interface AppNavConfig {
  scenes: Array<AppScene>
  categories: Array<AppSceneCategory>
  defaultSceneId: string
}

export interface AppNavConfigOptions {
  locale?: string
}

const DEFAULT_APP_SCENE_ID = 'vine-hub'
const DEFAULT_DOMAIN_NAV_CATEGORY = '业务应用'
const DEFAULT_APP_NAV_LOCALE = 'zh-CN'

const BUILT_IN_APP_SCENES: Array<AppScene> = [
  {
    id: 'vine-hub',
    label: 'Vine Hub',
    description: '面向 Cyacle 应用外壳的配置、门户和调试工作区。',
    category: 'Vine Hub',
    icon: LayoutDashboard,
    defaultTo: '/app/config',
    groups: [
      {
        id: 'app-group',
        title: '应用',
        items: [
          {
            id: 'app-config',
            label: '应用配置',
            description: '管理应用外壳、模块和工作台入口。',
            to: '/app/config',
            icon: PanelsTopLeft,
          },
        ],
      },
      {
        id: 'portal-group',
        title: '门户',
        items: [
          {
            id: 'portal-entry',
            label: '门户入口',
            description: '维护门户入口、菜单和访问路径。',
            to: '/portal/entry',
            icon: Compass,
          },
          {
            id: 'portal-rule',
            label: '门户规则',
            description: '配置门户路由、匹配规则和转发策略。',
            to: '/portal/rule',
            icon: GitBranch,
          },
          {
            id: 'portal-site',
            label: '门户站点',
            description: '管理站点域名、页面和发布状态。',
            to: '/portal/site',
            icon: Globe2,
          },
          {
            id: 'portal-cert',
            label: '门户证书',
            description: '管理站点证书、续期和安全配置。',
            to: '/portal/cert',
            icon: BadgeCheck,
          },
        ],
      },
      {
        id: 'app-status-group',
        title: '状态',
        items: [
          {
            id: 'app-status',
            label: '应用状态',
            description: '查看应用运行状态、健康检查和实时指标。',
            to: '/status/app',
            icon: Activity,
          },
        ],
      },
      {
        id: 'debug-group',
        title: '调试',
        items: [
          {
            id: 'debug-service-client',
            label: '服务客户端',
            description: '调试 VRPC 服务调用和请求返回。',
            to: '/debug/service-client',
            icon: Terminal,
          },
          {
            id: 'debug-task-launcher',
            label: '任务启动器',
            description: '启动、重试和观察后台任务。',
            to: '/debug/task-launcher',
            icon: CalendarClock,
          },
          {
            id: 'debug-event-emitter',
            label: '事件发射器',
            description: '调试事件发布、订阅和 payload。',
            to: '/debug/event-emitter',
            icon: Radio,
          },
        ],
      },
      {
        id: 'skeleton-group',
        title: '骨架',
        items: [
          {
            id: 'skeleton-domain',
            label: 'Domain 骨架',
            description: '管理 domain 模板、元信息和生成入口。',
            to: '/skeleton/domain',
            icon: Boxes,
          },
          {
            id: 'skeleton-actor',
            label: 'Actor 骨架',
            description: '维护 actor 模板和领域行为骨架。',
            to: '/skeleton/actor',
            icon: Users,
          },
          {
            id: 'skeleton-config',
            label: '配置骨架',
            description: '管理模板配置、默认值和生成参数。',
            to: '/skeleton/config',
            icon: SlidersHorizontal,
          },
          {
            id: 'skeleton-resource',
            label: '资源骨架',
            description: '维护资源定义、权限和访问约束。',
            to: '/skeleton/resource',
            icon: BadgeCheck,
          },
          {
            id: 'skeleton-data',
            label: '数据骨架',
            description: '维护数据结构、字段和初始化样例。',
            to: '/skeleton/data',
            icon: Braces,
          },
          {
            id: 'skeleton-service',
            label: '服务骨架',
            description: '维护服务接口、调用协议和生成规则。',
            to: '/skeleton/service',
            icon: Server,
          },
          {
            id: 'skeleton-task',
            label: '任务骨架',
            description: '维护任务定义、调度和执行模板。',
            to: '/skeleton/task',
            icon: CalendarClock,
          },
          {
            id: 'skeleton-event',
            label: '事件骨架',
            description: '维护事件定义、订阅和派发模板。',
            to: '/skeleton/event',
            icon: Radio,
          },
          {
            id: 'skeleton-web',
            label: 'Web 骨架',
            description: '维护 Web 入口、页面和组件模板。',
            to: '/skeleton/web',
            icon: Globe2,
          },
        ],
      },
    ],
  },
  {
    id: 'settings',
    label: '系统设置',
    description: '调整应用级设置、维护任务和运行参数。',
    category: 'Vine Hub',
    icon: Wrench,
    defaultTo: '/settings/dashboard-port',
    groups: [
      {
        id: 'settings-group',
        title: '设置',
        items: [
          {
            id: 'settings-dashboard-port',
            label: '仪表盘端口',
            description: '配置仪表盘端口、访问地址和本地调试参数。',
            to: '/settings/dashboard-port',
            icon: LayoutDashboard,
          },
        ],
      },
      {
        id: 'maintenance-group',
        title: '维护',
        items: [
          {
            id: 'maintenance',
            label: '数据更新',
            description: '执行数据刷新、缓存重建和维护任务。',
            to: '/maintenance/data-update',
            icon: RefreshCw,
          },
        ],
      },
    ],
  },
]

const BUILT_IN_APP_SCENE_CATEGORIES: Array<AppSceneCategory> = [
  {
    title: 'Vine Hub',
    sceneIds: ['vine-hub', 'settings'],
  },
]

export const MOCK_USER = {
  name: 'Cyacle',
  role: '',
  email: 'cyacle@yorun.ai',
}

function normalizeNavPath(path: string) {
  const trimmedPath = path.trim()

  if (!trimmedPath) {
    return '/'
  }

  if (trimmedPath.startsWith('/')) {
    return trimmedPath
  }

  return `/${trimmedPath}`
}

function createDefaultSceneId(defaultTo: string) {
  const normalizedPath = normalizeNavPath(defaultTo)
  const pathKey = normalizedPath
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

  return pathKey ? `domain-${pathKey}` : 'domain-root'
}

function normalizeDomainNavMeta(navMeta: DomainNavMeta): AppScene {
  const defaultTo = normalizeNavPath(navMeta.defaultTo)

  return {
    id: navMeta.id ?? createDefaultSceneId(defaultTo),
    label: navMeta.label,
    description: navMeta.desc,
    category: navMeta.category ?? DEFAULT_DOMAIN_NAV_CATEGORY,
    icon: navMeta.icon,
    defaultTo,
    groups: navMeta.groups.map((group) => ({
      id: group.id,
      title: group.title,
      items: group.items.map((item) => ({
        id: item.id,
        label: item.label,
        description: item.desc,
        to: normalizeNavPath(item.to),
        icon: item.icon,
      })),
    })),
  }
}

function getDomainNavMeta(
  domainRouteTree: DomainRouteTree,
  context: DomainNavMetaContext,
) {
  const navMetaFactory = (
    domainRouteTree.metas as AppLayoutDomainMetas | undefined
  )?.nav

  if (typeof navMetaFactory !== 'function') {
    return null
  }

  return navMetaFactory(context)
}

export function createAppNavConfig(
  domainRouteTrees: Array<DomainRouteTree>,
  options: AppNavConfigOptions = {},
): AppNavConfig {
  const navMetaContext = {
    locale: options.locale ?? DEFAULT_APP_NAV_LOCALE,
  }
  const scenes = [...BUILT_IN_APP_SCENES]
  const categories = BUILT_IN_APP_SCENE_CATEGORIES.map((category) => ({
    title: category.title,
    sceneIds: [...category.sceneIds],
  }))

  for (const domainRouteTree of domainRouteTrees) {
    const navMeta = getDomainNavMeta(domainRouteTree, navMetaContext)

    if (!navMeta) {
      continue
    }

    const scene = normalizeDomainNavMeta(navMeta)
    scenes.push(scene)

    const category = categories.find((item) => item.title === scene.category)
    if (category) {
      category.sceneIds.push(scene.id)
      continue
    }

    categories.push({
      title: scene.category,
      sceneIds: [scene.id],
    })
  }

  return {
    scenes,
    categories,
    defaultSceneId: DEFAULT_APP_SCENE_ID,
  }
}

export function getSceneById(navConfig: AppNavConfig, sceneId: string) {
  return navConfig.scenes.find((scene) => scene.id === sceneId) ?? null
}
