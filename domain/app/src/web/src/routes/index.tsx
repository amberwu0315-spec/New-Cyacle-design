import { createRootRoute } from '@tanstack/react-router'

import { RootComponent } from '../root-layout'
import { createHomeRouteTree } from './home-route'
import { resolveDomainRoutes, type DomainRouteTreeFactory } from './helpers/domain-routes-resolver'

export type { DomainRouteTreeFactory }

export function createAppRouteTree(factories: DomainRouteTreeFactory[]) {
  const RootRoute = createRootRoute({ component: RootComponent })
  const homeRoute = createHomeRouteTree({ RootRoute })
  const domainRoutes = resolveDomainRoutes(RootRoute, factories)

  return RootRoute.addChildren([homeRoute, ...domainRoutes])
}
