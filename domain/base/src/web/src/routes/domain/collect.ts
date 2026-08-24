import type { AnyRoute } from "@tanstack/react-router"

import type { WebDomain } from "./builder.ts"
import {
  webDomainOutletIds,
  type WebDomainOutlet,
  type WebDomainRootOutlet,
} from "./outlet-contract.ts"
import type { CollectedWebDomainRoutes } from "./reparent-route.ts"
import { assertWebRouteParent } from "./route-parent.ts"

type CapabilityKey<TDomains extends readonly WebDomain[]> = TDomains[number] extends infer TDomain
  ? TDomain extends { capabilities: infer TCapabilities }
    ? keyof TCapabilities & string
    : never
  : never

type CapabilityAt<
  TDomains extends readonly WebDomain[],
  TKey extends string,
> = TDomains[number] extends infer TDomain
  ? TDomain extends { capabilities: infer TCapabilities }
    ? TKey extends keyof TCapabilities
      ? TCapabilities[TKey]
      : never
    : never
  : never

type CapabilityEntryAt<
  TDomains extends readonly WebDomain[],
  TKey extends string,
> = TDomains[number] extends infer TDomain
  ? TDomain extends {
      readonly id: infer TId
      readonly capabilities: infer TCapabilities
    }
    ? TKey extends keyof TCapabilities
      ? {
          readonly domainId: TId
          readonly capability: TCapabilities[TKey]
        }
      : never
    : never
  : never

type WebDomainOutletMap = Readonly<
  { root: AnyRoute } & Record<WebDomainRootOutlet, AnyRoute | null>
>

type ExactWebDomainOutletMap<TOutlets extends WebDomainOutletMap> = TOutlets &
  Readonly<Record<Exclude<keyof TOutlets, WebDomainOutlet>, never>>

export type CollectedWebDomainOutletRoutes<
  TDomains extends readonly WebDomain[],
  TOutlets extends WebDomainOutletMap,
> = {
  readonly [TOutlet in WebDomainOutlet]: TOutlets[TOutlet] extends infer TParentRoute
    ? TParentRoute extends AnyRoute
      ? CollectedWebDomainRoutes<TDomains, TOutlet, TParentRoute>
      : readonly []
    : never
}

export function collectWebDomainRoutes<
  const TDomains extends readonly WebDomain[],
  const TOutlet extends WebDomainOutlet,
  const TParentRoute extends AnyRoute,
>(
  domains: TDomains,
  outlet: TOutlet,
  parentRoute: TParentRoute,
): CollectedWebDomainRoutes<TDomains, TOutlet, TParentRoute> {
  const collected: AnyRoute[] = []

  for (const domain of domains) {
    for (const route of domain.routes) {
      if (route.outlet === outlet) {
        const domainRoute = route.factory(parentRoute)
        assertWebRouteParent(domainRoute, parentRoute, `Domain "${domain.id}" outlet "${outlet}"`)
        collected.push(domainRoute)
      }
    }
  }

  return collected as unknown as CollectedWebDomainRoutes<TDomains, TOutlet, TParentRoute>
}

export function collectWebDomainCapabilities<
  const TDomains extends readonly WebDomain[],
  const TKey extends CapabilityKey<TDomains>,
>(domains: TDomains, key: TKey): Array<CapabilityAt<TDomains, TKey>> {
  return domains.flatMap((domain) => {
    if (!Object.hasOwn(domain.capabilities, key)) {
      return []
    }

    const capability = domain.capabilities[key]

    if (typeof capability === "undefined") {
      throw new TypeError(`Web domain capability "${key}" in "${domain.id}" cannot be undefined`)
    }

    return [capability as CapabilityAt<TDomains, TKey>]
  })
}

/** Collects a capability together with the domain that declared it. */
export function collectWebDomainCapabilityEntries<
  const TDomains extends readonly WebDomain[],
  const TKey extends CapabilityKey<TDomains>,
>(domains: TDomains, key: TKey): Array<CapabilityEntryAt<TDomains, TKey>> {
  return domains.flatMap((domain) => {
    if (!Object.hasOwn(domain.capabilities, key)) {
      return []
    }

    const capability = domain.capabilities[key]

    if (typeof capability === "undefined") {
      throw new TypeError(`Web domain capability "${key}" in "${domain.id}" cannot be undefined`)
    }

    return [{ domainId: domain.id, capability }] as Array<CapabilityEntryAt<TDomains, TKey>>
  })
}

/**
 * Validates the domain tuple and collects every route into the app's concrete
 * outlet routes. TanStack root creation and router options stay app-owned.
 */
export function collectWebDomains<
  const TDomains extends readonly WebDomain[],
  const TOutlets extends WebDomainOutletMap,
>(domains: TDomains, outlets: ExactWebDomainOutletMap<TOutlets>) {
  assertUniqueDomainIds(domains)
  assertExactOutlets(outlets)
  assertKnownDomainOutlets(domains)
  assertEnabledDomainOutlets(domains, outlets)

  const routes = Object.fromEntries(
    typedOutletNames().map((outlet) => {
      const parentRoute = outlets[outlet]

      return [
        outlet,
        parentRoute === null ? [] : collectWebDomainRoutes(domains, outlet, parentRoute),
      ]
    }),
  ) as unknown as CollectedWebDomainOutletRoutes<TDomains, TOutlets>

  return {
    capabilities<TKey extends CapabilityKey<TDomains>>(key: TKey) {
      return collectWebDomainCapabilities(domains, key)
    },
    capabilityEntries<TKey extends CapabilityKey<TDomains>>(key: TKey) {
      return collectWebDomainCapabilityEntries(domains, key)
    },
    domains,
    routes,
  }
}

function typedOutletNames() {
  return webDomainOutletIds
}

function assertUniqueDomainIds(domains: readonly WebDomain[]) {
  const domainIds = new Set<string>()

  for (const domain of domains) {
    if (domainIds.has(domain.id)) {
      throw new Error(`Duplicate web domain: ${domain.id}`)
    }
    domainIds.add(domain.id)
  }
}

function assertExactOutlets(outlets: WebDomainOutletMap) {
  const knownOutlets = new Set<string>(typedOutletNames())
  const declaredOutlets = new Set(Object.keys(outlets))
  const missingOutlets = [...knownOutlets].filter((outlet) => !declaredOutlets.has(outlet))
  const unknownOutlets = [...declaredOutlets].filter((outlet) => !knownOutlets.has(outlet))

  if (missingOutlets.length > 0) {
    throw new Error(`Missing web domain outlets: ${missingOutlets.join(", ")}`)
  }
  if (unknownOutlets.length > 0) {
    throw new Error(`Unknown web domain outlets: ${unknownOutlets.join(", ")}`)
  }
}

function assertKnownDomainOutlets(domains: readonly WebDomain[]) {
  const knownOutlets = new Set<string>(typedOutletNames())
  const unknownOutlets = new Set<string>()

  for (const domain of domains) {
    for (const route of domain.routes) {
      if (!knownOutlets.has(route.outlet)) {
        unknownOutlets.add(route.outlet)
      }
    }
  }

  if (unknownOutlets.size > 0) {
    throw new Error(`Unknown domain route outlets: ${[...unknownOutlets].join(", ")}`)
  }
}

function assertEnabledDomainOutlets(domains: readonly WebDomain[], outlets: WebDomainOutletMap) {
  for (const outlet of typedRootOutletNames()) {
    if (outlets[outlet] !== null) {
      continue
    }

    const domainIds = domains
      .filter((domain) => domain.routes.some((route) => route.outlet === outlet))
      .map((domain) => domain.id)

    if (domainIds.length > 0) {
      throw new Error(
        `Disabled web domain outlet "${outlet}" is used by domains: ${domainIds.join(", ")}`,
      )
    }
  }
}

function typedRootOutletNames() {
  return typedOutletNames().filter((outlet): outlet is WebDomainRootOutlet => outlet !== "root")
}
