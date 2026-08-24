import type { AnyRoute, Route } from "@tanstack/react-router"

import { type WebDomainOutlet, type WebDomainRootOutlet } from "../domain/outlet-contract.ts"
import { webDomainRootOutletIds } from "../config/outlets.ts"
import { assertWebRouteParent, describeWebRoute } from "../domain/route-parent.ts"

export type RouteWithChildren<TRoute extends AnyRoute, TChildren> = Route<
  unknown,
  TRoute["types"]["parentRoute"],
  TRoute["types"]["path"],
  TRoute["types"]["fullPath"],
  TRoute["types"]["customId"],
  TRoute["types"]["id"],
  TRoute["types"]["searchValidator"],
  TRoute["types"]["params"],
  TRoute["types"]["routerContext"],
  TRoute["types"]["routeContextFn"],
  TRoute["types"]["beforeLoadFn"],
  Extract<TRoute["types"]["loaderDeps"], Record<string, unknown>>,
  () => TRoute["types"]["loaderData"],
  TChildren,
  TRoute["types"]["fileRouteTypes"],
  TRoute["types"]["ssr"],
  unknown,
  undefined
>

/** Calls TanStack `addChildren` without widening a generic route to `AnyRoute`. */
export function addRouteChildren<
  const TRoute extends AnyRoute,
  const TChildren extends readonly AnyRoute[],
>(route: TRoute, children: TChildren) {
  return route.addChildren(children) as unknown as RouteWithChildren<TRoute, TChildren>
}

export type WebRouterOwnedRoutes = Partial<Readonly<Record<WebDomainOutlet, readonly AnyRoute[]>>>

type WebRootOutletMap = Readonly<Record<WebDomainRootOutlet, AnyRoute | null>>

type RoutesAt<
  TRoutes extends WebRouterOwnedRoutes,
  TOutlet extends WebDomainOutlet,
> = TOutlet extends keyof TRoutes
  ? TRoutes[TOutlet] extends readonly AnyRoute[]
    ? TRoutes[TOutlet]
    : readonly []
  : readonly []

type ComposedRootOutletRoute<
  TRootOutlet,
  TOwnedRoutes extends WebRouterOwnedRoutes,
  TDomainRoutes extends Readonly<Record<WebDomainOutlet, readonly AnyRoute[]>>,
  TOutlet extends WebDomainRootOutlet,
> = TRootOutlet extends AnyRoute
  ? RouteWithChildren<
      TRootOutlet,
      readonly [...RoutesAt<TOwnedRoutes, TOutlet>, ...TDomainRoutes[TOutlet]]
    >
  : never

type ComposedRootOutlets<
  TRootOutlets extends WebRootOutletMap,
  TOwnedRoutes extends WebRouterOwnedRoutes,
  TDomainRoutes extends Readonly<Record<WebDomainOutlet, readonly AnyRoute[]>>,
> = {
  readonly [TOutlet in WebDomainRootOutlet]: ComposedRootOutletRoute<
    TRootOutlets[TOutlet],
    TOwnedRoutes,
    TDomainRoutes,
    TOutlet
  >
}

type ComposedRootOutlet<
  TRootOutlets extends WebRootOutletMap,
  TOwnedRoutes extends WebRouterOwnedRoutes,
  TDomainRoutes extends Readonly<Record<WebDomainOutlet, readonly AnyRoute[]>>,
> = ComposedRootOutlets<TRootOutlets, TOwnedRoutes, TDomainRoutes>[WebDomainRootOutlet]

type RootChildren<
  TRootOutlets extends WebRootOutletMap,
  TOwnedRoutes extends WebRouterOwnedRoutes,
  TDomainRoutes extends Readonly<Record<WebDomainOutlet, readonly AnyRoute[]>>,
> = readonly [
  ...RoutesAt<TOwnedRoutes, "root">,
  ...TDomainRoutes["root"],
  ...ComposedRootOutlet<TRootOutlets, TOwnedRoutes, TDomainRoutes>[],
]

/** Composes app-owned and domain-owned routes under concrete outlet Routes. */
export function createWebRouteTree<
  const TRootRoute extends AnyRoute,
  const TRootOutlets extends WebRootOutletMap,
  const TOwnedRoutes extends WebRouterOwnedRoutes,
  const TDomainRoutes extends Readonly<Record<WebDomainOutlet, readonly AnyRoute[]>>,
>(
  rootRoute: TRootRoute,
  rootOutlets: TRootOutlets,
  ownedRoutes: TOwnedRoutes,
  domainRoutes: TDomainRoutes,
) {
  type OutletRoute = ComposedRootOutlet<TRootOutlets, TOwnedRoutes, TDomainRoutes>

  const outletRoutes = webDomainRootOutletIds.flatMap((outlet) => {
    const outletRoute = rootOutlets[outlet]
    const children = [
      ...(ownedRoutes[outlet] ?? []),
      ...domainRoutes[outlet],
    ] as readonly AnyRoute[]

    if (outletRoute === null) {
      if (children.length > 0) {
        throw new Error(`Disabled web domain outlet "${outlet}" has child routes`)
      }

      return []
    }

    for (const route of ownedRoutes[outlet] ?? []) {
      assertWebRouteParent(
        route,
        outletRoute,
        `App-owned route "${describeWebRoute(route)}" outlet "${outlet}"`,
      )
    }

    return [addRouteChildren(outletRoute, children)]
  }) as unknown as readonly OutletRoute[]

  const rootChildren = [
    ...(ownedRoutes.root ?? []),
    ...domainRoutes.root,
    ...outletRoutes,
  ] as unknown as RootChildren<TRootOutlets, TOwnedRoutes, TDomainRoutes>

  for (const route of ownedRoutes.root ?? []) {
    assertWebRouteParent(
      route,
      rootRoute,
      `App-owned route "${describeWebRoute(route)}" outlet "root"`,
    )
  }

  return addRouteChildren(rootRoute, rootChildren)
}
