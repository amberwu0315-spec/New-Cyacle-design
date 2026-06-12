import type { AnyRoute } from '@tanstack/react-router'

export type DomainRouteSlot = 'root' | 'layout'

export type DomainRouteBranchFactory = (deps: {
  RootRoute: AnyRoute
}) => AnyRoute | Array<AnyRoute>

export type DomainRouteSlotConfig = Partial<
  Record<DomainRouteSlot, Array<DomainRouteBranchFactory>>
>

export type DomainRouteConfig =
  | Array<DomainRouteBranchFactory>
  | DomainRouteSlotConfig

export interface DomainRouteTree<
  TMetas extends Record<string, unknown> = Record<string, unknown>,
> {
  routes: DomainRouteConfig
  metas?: TMetas
}

export type DomainRouteTreeFactory<
  TMetas extends Record<string, unknown> = Record<string, unknown>,
> = () => DomainRouteTree<TMetas>

export type DomainRouteTreeEntrypoint<
  TMetas extends Record<string, unknown> = Record<string, unknown>,
> = DomainRouteTreeFactory<TMetas> | DomainRouteBranchFactory

export interface DomainRouteTreeCollection<
  TMetas extends Record<string, unknown> = Record<string, unknown>,
> {
  routeTrees: Array<DomainRouteTree<TMetas>>
  layoutRouteBranchFactories: Array<DomainRouteBranchFactory>
}

export function defineDomainRouteTree<
  TMetas extends Record<string, unknown> = Record<string, unknown>,
>(routeTree: DomainRouteTree<TMetas>) {
  return routeTree
}

export function defineDomainRouteSlots(
  routeSlots: DomainRouteSlotConfig,
): DomainRouteSlotConfig {
  return routeSlots
}

export function defineLayoutRoutes(
  routes: Array<DomainRouteBranchFactory>,
): DomainRouteSlotConfig {
  return { layout: routes }
}

export function defineLayoutlessRoutes(
  routes: Array<DomainRouteBranchFactory>,
): DomainRouteSlotConfig {
  return { root: routes }
}

export function getDomainRouteBranchFactories(
  routeTree: DomainRouteTree,
  slot: DomainRouteSlot,
) {
  if (Array.isArray(routeTree.routes)) {
    return slot === 'layout' ? routeTree.routes : []
  }

  return routeTree.routes[slot] ?? []
}

export function resolveDomainRoutes(
  RootRoute: AnyRoute,
  routeFactories: Array<DomainRouteBranchFactory>,
): Array<AnyRoute> {
  return routeFactories.flatMap((factory) => {
    const result = factory({ RootRoute })
    return Array.isArray(result) ? result : [result]
  })
}

function isDomainRouteTree(value: unknown): value is DomainRouteTree {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  return 'routes' in value
}

function isDomainRouteBranchFactory(
  factory: DomainRouteTreeEntrypoint,
): factory is DomainRouteBranchFactory {
  return factory.length > 0
}

export function collectDomainRouteTrees(
  factories: Array<DomainRouteTreeEntrypoint>,
): DomainRouteTreeCollection {
  const routeTrees: Array<DomainRouteTree> = []
  const layoutRouteBranchFactories: Array<DomainRouteBranchFactory> = []

  for (const factory of factories) {
    if (isDomainRouteBranchFactory(factory)) {
      layoutRouteBranchFactories.push(factory)
      continue
    }

    const routeTree = factory()

    if (!isDomainRouteTree(routeTree)) {
      throw new Error(
        'createDomainRouteTree must return a DomainRouteTree or accept { RootRoute } as a route branch factory.',
      )
    }

    routeTrees.push(routeTree)
  }

  return {
    routeTrees,
    layoutRouteBranchFactories,
  }
}
