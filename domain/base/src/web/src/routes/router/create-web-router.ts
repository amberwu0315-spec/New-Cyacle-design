import {
  createRouter,
  type AnyRoute,
  type RouterConstructorOptions,
  type RouterHistory,
  type TrailingSlashOption,
} from "@tanstack/react-router"

import { defaultWebRouterOptions } from "../config/router.ts"
import { webDomainRootOutletIds } from "../config/outlets.ts"
import type { WebDomain } from "../domain/builder.ts"
import { collectWebDomains } from "../domain/collect.ts"
import { assertWebRouteParent } from "../domain/route-parent.ts"
import type {
  WebDomainOutlet,
  WebDomainOutletRoutes,
  WebDomainRootOutlet,
  WebDomainRootOutletRoutes,
} from "../domain/outlet-contract.ts"
import type { WebRouterOptions } from "./options.ts"
import { createWebRouteTree, type WebRouterOwnedRoutes } from "./route-tree.ts"

type RootOutletOf<TRootOutlets, TOutlet extends WebDomainRootOutlet> =
  TRootOutlets extends Readonly<Record<TOutlet, infer TRoute>>
    ? TRoute extends WebDomainRootOutletRoutes[TOutlet]
      ? TRoute
      : never
    : never

type RootOutletsOf<TRootOutlets> = Readonly<{
  [TOutlet in WebDomainRootOutlet]: RootOutletOf<TRootOutlets, TOutlet>
}>

// `AnyRoute[]` here would contextually widen inline `createRoute()` calls and
// erase their path/params. Validate the outlet shape first, then recover the
// concrete Route tuple after inference has completed.
type WebRouterRoutesShape = Partial<
  Readonly<Record<WebDomainOutlet, readonly object[]>>
>

type ExactOwnedRoutes<TRoutes extends WebRouterRoutesShape> = TRoutes &
  Readonly<Record<Exclude<keyof TRoutes, WebDomainOutlet>, never>>

type RouterOwnedRoutesOf<TRoutes extends WebRouterRoutesShape> = Extract<
  TRoutes,
  WebRouterOwnedRoutes
>

type ValidateRootOutlets<TRootOutlets> = TRootOutlets extends WebDomainRootOutletRoutes
  ? Exclude<keyof TRootOutlets, WebDomainRootOutlet> extends never
    ? unknown
    : {
        readonly rootOutlets: Readonly<
          Record<Exclude<keyof TRootOutlets, WebDomainRootOutlet>, never>
        >
      }
  : { readonly rootOutlets: WebDomainRootOutletRoutes }

type RegisteredDomainOutlet<TDomains extends readonly WebDomain[]> =
  TDomains[number] extends infer TDomain
    ? TDomain extends { readonly routes: infer TRoutes }
      ? TRoutes extends readonly unknown[]
        ? TRoutes[number] extends { readonly outlet: infer TOutlet }
          ? TOutlet
          : never
        : never
      : never
    : never

type StaticallyDisabledRootOutlet<TRootOutlets> = {
  [TOutlet in WebDomainRootOutlet]: [RootOutletOf<TRootOutlets, TOutlet>] extends [never]
    ? never
    : [RootOutletOf<TRootOutlets, TOutlet>] extends [null]
      ? TOutlet
      : never
}[WebDomainRootOutlet]

type DisabledDomainOutlet<TRootOutlets, TDomains extends readonly WebDomain[]> = Extract<
  RegisteredDomainOutlet<TDomains>,
  StaticallyDisabledRootOutlet<TRootOutlets>
>

type ValidateEnabledDomainOutlets<TRootOutlets, TDomains extends readonly WebDomain[]> =
  DisabledDomainOutlet<TRootOutlets, TDomains> extends never
    ? unknown
    : {
        readonly rootOutlets: Readonly<Record<DisabledDomainOutlet<TRootOutlets, TDomains>, never>>
      }

export interface CreateWebRouterOptions<
  TRootRoute extends AnyRoute,
  TRootOutlets,
  TDomains extends readonly WebDomain[],
> {
  readonly domains: TDomains
  readonly rootRoute: TRootRoute
  readonly rootOutlets: TRootOutlets
  readonly router?: WebRouterOptions
}

/** Creates the app or standalone Router from one shared outlet topology. */
export function createWebRouter<
  const TRootRoute extends AnyRoute,
  const TRootOutlets,
  const TDomains extends readonly WebDomain[],
  const TOwnedRoutes extends WebRouterRoutesShape = {},
>(
  options: CreateWebRouterOptions<TRootRoute, TRootOutlets, TDomains> &
    {
      readonly routes?: (
        outlets: WebDomainOutletRoutes<TRootRoute, RootOutletsOf<TRootOutlets>>,
      ) => ExactOwnedRoutes<TOwnedRoutes>
    } &
    ValidateRootOutlets<TRootOutlets> &
    ValidateEnabledDomainOutlets<TRootOutlets, TDomains>,
) {
  const outlets = {
    ...options.rootOutlets,
    root: options.rootRoute,
  } as unknown as WebDomainOutletRoutes<TRootRoute, RootOutletsOf<TRootOutlets>>
  const rootOutlets = options.rootOutlets as RootOutletsOf<TRootOutlets>
  for (const outlet of webDomainRootOutletIds) {
    const outletRoute = rootOutlets[outlet]

    if (outletRoute !== null) {
      assertWebRouteParent(outletRoute, options.rootRoute, `Root outlet "${outlet}"`)
    }
  }
  const ownedRoutes = (options.routes?.(outlets) ?? {}) as RouterOwnedRoutesOf<TOwnedRoutes>
  const webDomains = collectWebDomains(options.domains, outlets)
  const routeTree = createWebRouteTree(
    options.rootRoute,
    rootOutlets,
    ownedRoutes,
    webDomains.routes,
  )
  const routerOptions = {
    ...defaultWebRouterOptions,
    ...options.router,
    routeTree,
  } as unknown as RouterConstructorOptions<
    typeof routeTree,
    TrailingSlashOption,
    boolean,
    RouterHistory,
    Record<string, unknown>
  >
  const router = createRouter<
    typeof routeTree,
    TrailingSlashOption,
    boolean,
    RouterHistory,
    Record<string, unknown>
  >(routerOptions)

  return {
    outlets,
    webDomains,
    routeTree,
    router,
  }
}
