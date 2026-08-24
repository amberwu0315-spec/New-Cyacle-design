import type { AnyRoute } from "@tanstack/react-router"

import type { WebDomainOutlet } from "./outlet-contract.ts"

export type WebDomainRouteFactory = (parentRoute: AnyRoute) => AnyRoute

export interface WebDomainRouteRegistration<
  TOutlet extends WebDomainOutlet = WebDomainOutlet,
  TFactory extends WebDomainRouteFactory = WebDomainRouteFactory,
> {
  readonly factory: TFactory
  readonly outlet: TOutlet
}

export type WebDomainRoutes = readonly WebDomainRouteRegistration[]

export interface WebDomain<
  TId extends string = string,
  TRoutes extends WebDomainRoutes = WebDomainRoutes,
  TCapabilities extends object = Record<string, unknown>,
> {
  readonly capabilities: TCapabilities
  readonly id: TId
  readonly routes: TRoutes
}

type AddRoute<
  TRoutes extends WebDomainRoutes,
  TOutlet extends WebDomainOutlet,
  TFactory extends WebDomainRouteFactory,
> = readonly [...TRoutes, WebDomainRouteRegistration<TOutlet, TFactory>]

type AddCapability<TCapabilities, TKey extends string, TValue> = Omit<TCapabilities, TKey> &
  Readonly<Record<TKey, TValue>>

export interface WebDomainBuilder<
  TId extends string,
  TRoutes extends WebDomainRoutes,
  TCapabilities extends object,
> extends WebDomain<TId, TRoutes, TCapabilities> {
  addCapability<const TKey extends string, const TValue>(
    key: TKey,
    value: Exclude<TValue, undefined>,
  ): WebDomainBuilder<TId, TRoutes, AddCapability<TCapabilities, TKey, TValue>>

  addRoute<const TOutlet extends WebDomainOutlet, const TFactory extends WebDomainRouteFactory>(
    outlet: TOutlet,
    factory: TFactory,
  ): WebDomainBuilder<TId, AddRoute<TRoutes, TOutlet, TFactory>, TCapabilities>
}

/** Creates an immutable domain builder while retaining route literal types. */
export function createWebDomain<const TId extends string>(
  id: TId,
): WebDomainBuilder<TId, readonly [], {}> {
  return buildWebDomain(id, [], {})
}

function buildWebDomain<
  const TId extends string,
  const TRoutes extends WebDomainRoutes,
  const TCapabilities extends object,
>(
  id: TId,
  routes: TRoutes,
  capabilities: TCapabilities,
): WebDomainBuilder<TId, TRoutes, TCapabilities> {
  return {
    id,
    routes,
    capabilities,
    addCapability(key, value) {
      if (typeof value === "undefined") {
        throw new TypeError(`Web domain capability "${key}" cannot be undefined`)
      }

      return buildWebDomain(id, routes, {
        ...capabilities,
        [key]: value,
      })
    },
    addRoute(outlet, factory) {
      return buildWebDomain(id, [...routes, { outlet, factory }], capabilities)
    },
  } as WebDomainBuilder<TId, TRoutes, TCapabilities>
}
