import '#/project-config.ts'

import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import {
  assertWebProjectConfigConfigured,
  defineWebDomainRouteOutlets,
  resolveWebDomainRouteMount,
} from '@carbonnt-cyacle/web-base'
import { createDocumentManagementRoute } from '@carbonnt-cyacle/web-uic'

import { AppLayout } from '#/components/layouts/app-layout/index.ts'
import { createHomeRoute } from '#/routes/home-route.ts'
import { webModules } from '#/vineModules.gen.ts'

assertWebProjectConfigConfigured()

const appRouteOutlets = defineWebDomainRouteOutlets({
  root: 'root',
  shell: 'shell',
})

const RootRoute = createRootRoute()

const ShellRoute = createRoute({
  getParentRoute: () => RootRoute,
  id: 'shell',
  component: AppLayout,
})

const rootDomainRoutes = resolveWebDomainRouteMount({
  domains: webModules,
  outlet: appRouteOutlets.root,
  parentRoute: RootRoute,
})

const shellDomainRoutes = resolveWebDomainRouteMount({
  domains: webModules,
  outlet: appRouteOutlets.shell,
  parentRoute: ShellRoute,
})

const routeTree = RootRoute.addChildren([
  ...rootDomainRoutes,
  ShellRoute.addChildren([
    createHomeRoute({ parentRoute: ShellRoute }),
    createDocumentManagementRoute({ parentRoute: ShellRoute }),
    ...shellDomainRoutes,
  ]),
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
