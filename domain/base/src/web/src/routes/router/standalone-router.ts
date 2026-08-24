import { createRootRoute, createRoute, type AnyRoute } from "@tanstack/react-router"

import type { WebDomain } from "../domain/builder.ts"
import { webDomainRootOutletIds } from "../config/outlets.ts"
import type { WebDomainRootOutlet } from "../domain/outlet-contract.ts"
import { createWebRouter } from "./create-web-router.ts"

/** Creates the Router used when a web domain runs or type-checks by itself. */
export function createStandaloneWebDomainRouter<const TDomain extends WebDomain>(domain: TDomain) {
  const rootRoute = createRootRoute()
  const rootOutlets = createStandaloneRootOutlets(rootRoute)
  const webRouter = createWebRouter({
    rootRoute,
    rootOutlets,
    domains: [domain],
    routes: ({ app }) => {
      const homeRoute = createRoute({
        getParentRoute: () => app,
        path: "/",
      })

      return {
        app: [homeRoute],
      }
    },
  })

  return webRouter.router
}

type StandaloneRootOutletRoute<
  TRootRoute extends AnyRoute,
  TOutlet extends WebDomainRootOutlet,
> = ReturnType<typeof createStandaloneRootOutlet<TOutlet, TRootRoute>>

type StandaloneRootOutlets<TRootRoute extends AnyRoute> = {
  readonly [TOutlet in WebDomainRootOutlet]: StandaloneRootOutletRoute<TRootRoute, TOutlet>
}

function createStandaloneRootOutlets<const TRootRoute extends AnyRoute>(rootRoute: TRootRoute) {
  return Object.fromEntries(
    webDomainRootOutletIds.map((outlet) => [outlet, createStandaloneRootOutlet(rootRoute, outlet)]),
  ) as StandaloneRootOutlets<TRootRoute>
}

function createStandaloneRootOutlet<
  const TOutlet extends WebDomainRootOutlet,
  const TRootRoute extends AnyRoute,
>(rootRoute: TRootRoute, outlet: TOutlet) {
  return createRoute({
    getParentRoute: () => rootRoute,
    id: outlet,
  })
}
