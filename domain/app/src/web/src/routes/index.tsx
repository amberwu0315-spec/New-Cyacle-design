import { createRootRoute } from '@tanstack/react-router'

import { createAppNavConfig } from '../components/layouts/app-layout/nav-config'
import { RootComponent } from '../root-layout'
import { createAppLayoutRoute } from './app-layout-route'
import { createHomeRouteTree } from './home-route'
import type { DomainRouteTreeCollection } from './helpers/domain-route-tree'
import {
  getDomainRouteBranchFactories,
  resolveDomainRoutes,
} from './helpers/domain-route-tree'

export type {
  DomainRouteConfig,
  DomainRouteSlot,
  DomainRouteSlotConfig,
  DomainRouteBranchFactory,
  DomainRouteTree,
  DomainRouteTreeEntrypoint,
  DomainRouteTreeFactory,
  DomainRouteTreeCollection,
} from './helpers/domain-route-tree'

export function createAppRouteTree(domainRouteTrees: DomainRouteTreeCollection) {
  const { routeTrees, layoutRouteBranchFactories } = domainRouteTrees
  const RootRoute = createRootRoute({ component: RootComponent })
  const navConfig = createAppNavConfig(routeTrees)
  const AppLayoutRoute = createAppLayoutRoute({ RootRoute, navConfig })
  const homeRoute = createHomeRouteTree({ RootRoute: AppLayoutRoute })
  const rootDomainRoutes = resolveDomainRoutes(
    RootRoute,
    routeTrees.flatMap((routeTree) =>
      getDomainRouteBranchFactories(routeTree, 'root'),
    ),
  )
  const layoutDomainRoutes = resolveDomainRoutes(
    AppLayoutRoute,
    [
      ...routeTrees.flatMap((routeTree) =>
        getDomainRouteBranchFactories(routeTree, 'layout'),
      ),
      ...layoutRouteBranchFactories,
    ],
  )

  return RootRoute.addChildren([
    ...rootDomainRoutes,
    AppLayoutRoute.addChildren([homeRoute, ...layoutDomainRoutes]),
  ])
}
