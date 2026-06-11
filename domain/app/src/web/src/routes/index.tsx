import { createRootRoute } from '@tanstack/react-router'

import { RootComponent } from '../root-layout'
import { createAppLayoutRoute } from './app-layout-route'
import { createHomeRouteTree } from './home-route'
import { resolveDomainRoutes, type DomainRouteTreeFactory } from './helpers/domain-routes-resolver'

export type { DomainRouteTreeFactory }

export function createAppRouteTree(factories: DomainRouteTreeFactory[]) {
  const RootRoute = createRootRoute({ component: RootComponent })
  const AppLayoutRoute = createAppLayoutRoute({ RootRoute })
  const homeRoute = createHomeRouteTree({ RootRoute: AppLayoutRoute })
  const domainRoutes = resolveDomainRoutes(AppLayoutRoute, factories)

  return RootRoute.addChildren([
    AppLayoutRoute.addChildren([homeRoute, ...domainRoutes]),
  ])
}
