import type { AnyRoute, ResolveFullPath, ResolveId, Route } from "@tanstack/react-router"

import type { WebDomain } from "./builder.ts"
import type { WebDomainOutlet } from "./outlet-contract.ts"

// Domain factories are compiled once against the stable AnyRoute boundary.
// Collection then rebinds their TanStack type tree to the app's actual outlet
// route so paths, params, search, loader data, and children remain precise.
type ReparentRouteBase<TRoute extends AnyRoute, TParentRoute extends AnyRoute> = Route<
  unknown,
  TParentRoute,
  TRoute["types"]["path"],
  ResolveFullPath<TParentRoute, TRoute["types"]["path"]>,
  TRoute["types"]["customId"],
  ResolveId<TParentRoute, TRoute["types"]["customId"], TRoute["types"]["path"]>,
  TRoute["types"]["searchValidator"],
  TRoute["types"]["params"],
  TRoute["types"]["routerContext"],
  TRoute["types"]["routeContextFn"],
  TRoute["types"]["beforeLoadFn"],
  Extract<TRoute["types"]["loaderDeps"], Record<string, unknown>>,
  () => TRoute["types"]["loaderData"],
  unknown,
  TRoute["types"]["fileRouteTypes"],
  TRoute["types"]["ssr"],
  unknown,
  undefined
>

type ReparentChildren<
  TChildren,
  TParentRoute extends AnyRoute,
> = TChildren extends readonly AnyRoute[]
  ? {
      readonly [TIndex in keyof TChildren]: TChildren[TIndex] extends AnyRoute
        ? ReparentRoute<TChildren[TIndex], TParentRoute>
        : TChildren[TIndex]
    }
  : TChildren extends Record<string, AnyRoute>
    ? {
        readonly [TKey in keyof TChildren]: ReparentRoute<TChildren[TKey], TParentRoute>
      }
    : TChildren

type ReparentRoute<TRoute extends AnyRoute, TParentRoute extends AnyRoute> =
  TRoute extends AnyRoute ? ReparentRouteMember<TRoute, TParentRoute> : never

/** Preserve path and params correlation for sibling route unions. */
type ReparentRouteMember<TRoute extends AnyRoute, TParentRoute extends AnyRoute> = Route<
  unknown,
  TParentRoute,
  TRoute["types"]["path"],
  ResolveFullPath<TParentRoute, TRoute["types"]["path"]>,
  TRoute["types"]["customId"],
  ResolveId<TParentRoute, TRoute["types"]["customId"], TRoute["types"]["path"]>,
  TRoute["types"]["searchValidator"],
  TRoute["types"]["params"],
  TRoute["types"]["routerContext"],
  TRoute["types"]["routeContextFn"],
  TRoute["types"]["beforeLoadFn"],
  Extract<TRoute["types"]["loaderDeps"], Record<string, unknown>>,
  () => TRoute["types"]["loaderData"],
  ReparentChildren<TRoute["types"]["children"], ReparentRouteBase<TRoute, TParentRoute>>,
  TRoute["types"]["fileRouteTypes"],
  TRoute["types"]["ssr"],
  unknown,
  undefined
>

type FactoryResult<TFactory> = TFactory extends (
  // `any` intentionally mirrors TypeScript's built-in ReturnType.
  ...args: any[]
) => infer TResult
  ? TResult
  : never

type CollectFactory<TFactory, TParentRoute extends AnyRoute> =
  FactoryResult<TFactory> extends infer TResult
    ? TResult extends AnyRoute
      ? readonly [ReparentRoute<TResult, TParentRoute>]
      : []
    : []

type CollectRouteRegistrations<
  TRoutes,
  TOutlet extends WebDomainOutlet,
  TParentRoute extends AnyRoute,
> = TRoutes extends readonly [infer TRoute, ...infer TRest]
  ? TRoute extends {
      outlet: infer TRouteOutlet
      factory: infer TFactory
    }
    ? readonly [
        ...(TRouteOutlet extends TOutlet ? CollectFactory<TFactory, TParentRoute> : []),
        ...CollectRouteRegistrations<TRest, TOutlet, TParentRoute>,
      ]
    : CollectRouteRegistrations<TRest, TOutlet, TParentRoute>
  : readonly []

type CollectDomain<
  TDomain,
  TOutlet extends WebDomainOutlet,
  TParentRoute extends AnyRoute,
> = TDomain extends { routes: infer TRoutes }
  ? CollectRouteRegistrations<TRoutes, TOutlet, TParentRoute>
  : readonly []

export type CollectedWebDomainRoutes<
  TDomains extends readonly WebDomain[],
  TOutlet extends WebDomainOutlet,
  TParentRoute extends AnyRoute,
> = TDomains extends readonly [infer TDomain, ...infer TRest]
  ? readonly [
      ...CollectDomain<TDomain, TOutlet, TParentRoute>,
      ...CollectedWebDomainRoutes<Extract<TRest, readonly WebDomain[]>, TOutlet, TParentRoute>,
    ]
  : readonly []
