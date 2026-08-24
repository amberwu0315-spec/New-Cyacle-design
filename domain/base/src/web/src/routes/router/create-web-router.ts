import {
  createRouter,
  type AnyRoute,
  type RouterConstructorOptions,
  type RouterHistory,
  type TrailingSlashOption,
} from '@tanstack/react-router'
import { defaultWebRouterOptions } from '../config/router.ts'
import { webDomainRootOutletIds } from '../web-domain.ts'
import {
  assertWebRouteParent,
  collectWebDomains,
  type WebDomain,
} from '../web-domain.ts'
import { createWebRouteTree, type WebRouterOwnedRoutes } from './route-tree.ts'
import type { WebRouterOptions } from './options.ts'

type RootOutlets = Readonly<Record<(typeof webDomainRootOutletIds)[number], AnyRoute | null>>

export function createWebRouter<const TRootRoute extends AnyRoute, const TDomains extends readonly WebDomain[]>(
  options: {
    rootRoute: TRootRoute
    domains: TDomains
    rootOutlets: RootOutlets
    routes?: (outlets: RootOutlets & { root: TRootRoute }) => WebRouterOwnedRoutes
    router?: WebRouterOptions
  },
) {
  for (const outlet of webDomainRootOutletIds) {
    const rootOutlet = options.rootOutlets[outlet]
    if (rootOutlet) {
      assertWebRouteParent(rootOutlet, options.rootRoute, `Root outlet "${outlet}"`)
    }
  }

  const outlets = { ...options.rootOutlets, root: options.rootRoute } as RootOutlets & {
    root: TRootRoute
  }
  const ownedRoutes = options.routes?.(outlets) ?? {}
  const webDomains = collectWebDomains(options.domains, outlets)
  const domainRoutes = webDomains.routes

  const routeTree = createWebRouteTree(
    options.rootRoute,
    options.rootOutlets,
    ownedRoutes,
    domainRoutes,
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
  const router = createRouter(routerOptions)
  return { outlets, webDomains, routeTree, router }
}
