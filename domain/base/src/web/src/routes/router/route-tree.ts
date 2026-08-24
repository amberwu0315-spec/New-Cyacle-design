import { type AnyRoute, type Route } from '@tanstack/react-router'
import {
  assertWebRouteParent,
  describeWebRoute,
  webDomainRootOutletIds,
} from '../web-domain.ts'
import type { WebDomainOutlet } from '../web-domain.ts'

export type WebRouterOwnedRoutes = Partial<Readonly<Record<WebDomainOutlet, readonly AnyRoute[]>>>

export function addRouteChildren<
  const TRoute extends AnyRoute,
  const TChildren extends readonly AnyRoute[],
>(route: TRoute, children: TChildren) {
  return route.addChildren(children) as unknown as Route
}

export function createWebRouteTree(
  rootRoute: AnyRoute,
  rootOutlets: Readonly<Record<(typeof webDomainRootOutletIds)[number], AnyRoute | null>>,
  ownedRoutes: WebRouterOwnedRoutes,
  domainRoutes: Readonly<Record<WebDomainOutlet, readonly AnyRoute[]>>,
) {
  const outletRoutes = webDomainRootOutletIds.flatMap((outlet) => {
    const outletRoute = rootOutlets[outlet]
    const children = [...(ownedRoutes[outlet] ?? []), ...domainRoutes[outlet]]
    if (outletRoute === null) {
      if (children.length) {
        throw new Error(`Disabled web domain outlet "${outlet}" has child routes`)
      }
      return []
    }
    for (const route of ownedRoutes[outlet] ?? []) {
      assertWebRouteParent(route, outletRoute, `App-owned route "${describeWebRoute(route)}"`)
    }
    return [addRouteChildren(outletRoute, children)]
  })

  for (const route of ownedRoutes.root ?? []) {
    assertWebRouteParent(route, rootRoute, `App-owned route "${describeWebRoute(route)}"`)
  }
  return addRouteChildren(rootRoute, [
    ...(ownedRoutes.root ?? []),
    ...domainRoutes.root,
    ...outletRoutes,
  ])
}
