import { createRootRoute, createRoute } from '@tanstack/react-router'
import { webDomainRootOutletIds, type WebDomain } from '../web-domain.ts'
import { createWebRouter } from './create-web-router.ts'

export function createStandaloneWebDomainRouter<const TDomain extends WebDomain>(domain: TDomain) {
  const rootRoute = createRootRoute()
  const rootOutlets = Object.fromEntries(
    webDomainRootOutletIds.map((outlet) => [
      outlet,
      createRoute({ getParentRoute: () => rootRoute, id: outlet }),
    ]),
  ) as unknown as Record<(typeof webDomainRootOutletIds)[number], ReturnType<typeof createRoute>>

  return createWebRouter({
    rootRoute,
    rootOutlets,
    domains: [domain],
    routes: ({ app }) => ({
      app: [createRoute({ getParentRoute: () => app!, path: '/' })],
    }),
  }).router
}
