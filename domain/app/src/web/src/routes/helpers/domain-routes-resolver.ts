import type { AnyRoute } from '@tanstack/react-router'

export type DomainRouteTreeFactory = (deps: { RootRoute: any }) => AnyRoute | AnyRoute[]

export function resolveDomainRoutes(RootRoute: AnyRoute, factories: DomainRouteTreeFactory[]): AnyRoute[] {
  return factories.flatMap((f) => {
    const result = f({ RootRoute })
    return Array.isArray(result) ? result : [result]
  })
}
