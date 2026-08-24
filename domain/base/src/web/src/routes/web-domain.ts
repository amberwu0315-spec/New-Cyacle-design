import type { AnyRoute } from '@tanstack/react-router'

/** Pathless layout outlets shared by the app and every feature domain. */
export const webDomainRootOutletIds = ['app', 'admin', 'wuxibiologics'] as const
export const webDomainOutletIds = ['root', ...webDomainRootOutletIds] as const

export type WebDomainRootOutlet = (typeof webDomainRootOutletIds)[number]
export type WebDomainOutlet = (typeof webDomainOutletIds)[number]
export type WebRouteHandle = AnyRoute
export type WebDomainCapabilities = Record<string, unknown>
export type WebDomainRouteMountKey = WebDomainOutlet
export type WebDomainRouteOutlets<TMountKey extends string = WebDomainOutlet> = Readonly<
  Record<string, TMountKey>
>
export interface WebDomainRouteFactoryContext<
  TMountKey extends string = WebDomainOutlet,
> {
  capabilities: WebDomainCapabilities
  domainId: string
  outlet: TMountKey
  parentRoute: WebRouteHandle
}

export type WebDomainRouteFactory = (
  parentRoute: AnyRoute,
) => AnyRoute | readonly AnyRoute[]

export type WebDomainRouteMounts = Partial<
  Record<WebDomainOutlet, readonly WebDomainRouteFactory[]>
>

export interface WebDomainRouteRegistration<
  TOutlet extends WebDomainOutlet = WebDomainOutlet,
  TFactory extends WebDomainRouteFactory = WebDomainRouteFactory,
> {
  readonly outlet: TOutlet
  readonly factory: TFactory
}

export interface WebDomain<
  TId extends string = string,
  TRoutes extends readonly WebDomainRouteRegistration[] = readonly WebDomainRouteRegistration[],
  TCapabilities extends object = Record<string, unknown>,
> {
  readonly id: TId
  readonly routes?: TRoutes
  readonly capabilities?: TCapabilities
  /** Legacy shape kept for a transition period; new domains should use routes. */
  readonly routeMounts?: Partial<Record<WebDomainOutlet, readonly WebDomainRouteFactory[]>>
}

type AddRoute<
  TRoutes extends readonly WebDomainRouteRegistration[],
  TOutlet extends WebDomainOutlet,
  TFactory extends WebDomainRouteFactory,
> = readonly [...TRoutes, WebDomainRouteRegistration<TOutlet, TFactory>]

type AddCapability<TCapabilities, TKey extends string, TValue> = Omit<
  TCapabilities,
  TKey
> &
  Readonly<Record<TKey, TValue>>

export interface WebDomainBuilder<
  TId extends string,
  TRoutes extends readonly WebDomainRouteRegistration[],
  TCapabilities extends object,
> extends WebDomain<TId, TRoutes, TCapabilities> {
  readonly routes: TRoutes
  readonly capabilities: TCapabilities
  addRoute<const TOutlet extends WebDomainOutlet, const TFactory extends WebDomainRouteFactory>(
    outlet: TOutlet,
    factory: TFactory,
  ): WebDomainBuilder<TId, AddRoute<TRoutes, TOutlet, TFactory>, TCapabilities>
  addCapability<const TKey extends string, const TValue>(
    key: TKey,
    value: Exclude<TValue, undefined>,
  ): WebDomainBuilder<TId, TRoutes, AddCapability<TCapabilities, TKey, TValue>>
}

export function createWebDomain<const TId extends string>(
  id: TId,
): WebDomainBuilder<TId, readonly [], {}> {
  return buildWebDomain(id, [], {})
}

function buildWebDomain<
  const TId extends string,
  const TRoutes extends readonly WebDomainRouteRegistration[],
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
    addRoute(outlet, factory) {
      return buildWebDomain(id, [...routes, { outlet, factory }], capabilities)
    },
    addCapability(key, value) {
      if (typeof value === 'undefined') {
        throw new TypeError(`Web domain capability "${key}" cannot be undefined`)
      }
      return buildWebDomain(id, routes, { ...capabilities, [key]: value })
    },
  } as WebDomainBuilder<TId, TRoutes, TCapabilities>
}

/** Compatibility adapter for domains not yet migrated to the fluent builder. */
export function defineWebDomain<const TDomain extends WebDomain>(domain: TDomain): TDomain
export function defineWebDomain(): <const TDomain extends WebDomain>(domain: TDomain) => TDomain
export function defineWebDomain(domain?: WebDomain) {
  return domain ?? ((value: WebDomain) => value)
}

export function defineWebDomainRouteOutlets<const TOutlets>(outlets: TOutlets) {
  return outlets
}

function legacyRoutes(domain: WebDomain): WebDomainRouteRegistration[] {
  if (domain.routes) return [...domain.routes]
  return Object.entries(domain.routeMounts ?? {}).flatMap(([outlet, factories]) =>
    (factories ?? []).map((factory) => ({ outlet: outlet as WebDomainOutlet, factory })),
  )
}

export function collectWebDomainRoutes(
  domains: readonly WebDomain[],
  outlet: WebDomainOutlet,
  parentRoute: AnyRoute,
): AnyRoute[] {
  return domains.flatMap((domain) =>
    legacyRoutes(domain)
      .filter((registration) => registration.outlet === outlet)
      .flatMap((registration) => {
        const result = registration.factory(parentRoute)
        return Array.isArray(result) ? [...result] : [result]
      }),
  )
}

export function collectWebDomains(
  domains: readonly WebDomain[],
  outlets: Readonly<Record<WebDomainRootOutlet, AnyRoute | null>> & {
    root: AnyRoute
  },
) {
  const ids = new Set<string>()
  for (const domain of domains) {
    if (ids.has(domain.id)) throw new Error(`Duplicate web domain: ${domain.id}`)
    ids.add(domain.id)

    for (const registration of legacyRoutes(domain)) {
      if (!webDomainOutletIds.includes(registration.outlet)) {
        throw new Error(`Unknown domain route outlet: ${registration.outlet}`)
      }
      if (registration.outlet !== 'root' && outlets[registration.outlet] === null) {
        throw new Error(
          `Disabled web domain outlet "${registration.outlet}" is used by domain: ${domain.id}`,
        )
      }
    }
  }

  const routes = Object.fromEntries(
    webDomainOutletIds.map((outlet) => [
      outlet,
      outlet === 'root' || outlets[outlet] !== null
        ? collectWebDomainRoutes(
            domains,
            outlet,
            outlet === 'root' ? outlets.root : outlets[outlet]!,
          )
        : [],
    ]),
  ) as unknown as Readonly<Record<WebDomainOutlet, readonly AnyRoute[]>>

  return {
    domains,
    routes,
    capabilities: (key: string) => collectWebDomainCapabilities(domains, key),
    capabilityEntries: (key: string) => collectWebDomainCapabilityEntries(domains, key),
  }
}

export function collectWebDomainCapabilities<TCapability>(
  domains: readonly WebDomain[],
  key: string,
): TCapability[] {
  return domains.flatMap((domain) => {
    const value = domain.capabilities?.[key]
    return typeof value === 'undefined' ? [] : [value as TCapability]
  })
}

export function collectWebDomainCapabilityEntries<TCapability>(
  domains: readonly WebDomain[],
  key: string,
) {
  return domains.flatMap((domain) => {
    const value = domain.capabilities?.[key]
    return typeof value === 'undefined'
      ? []
      : [{ domainId: domain.id, capability: value as TCapability }]
  })
}

export function assertWebRouteParent(route: AnyRoute, parentRoute: AnyRoute, owner: string) {
  const getParentRoute = route.options?.getParentRoute
  if (typeof getParentRoute !== 'function') return
  if (getParentRoute() !== parentRoute) {
    throw new Error(`${owner} is attached to a different parent route`)
  }
}

export function describeWebRoute(route: AnyRoute) {
  const options = route.options as { id?: unknown; path?: unknown }
  return options.id ?? options.path ?? route.id ?? 'anonymous'
}

export function forwardComponentPreload<T extends (...args: any[]) => any>(
  component: T,
  page: { preload?: () => Promise<unknown> },
) {
  Object.defineProperty(component, 'preload', {
    configurable: true,
    get: () => page.preload,
  })
  return component
}
