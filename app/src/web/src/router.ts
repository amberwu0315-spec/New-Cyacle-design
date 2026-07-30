import '#/project-config.ts'

import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import {
  createWorkbenchSidebarDemoRoute,
  defineWebDomainRouteOutlets,
  resolveWebDomainRouteMount,
} from '@carbonnt-cyacle/web-base'

import { AppLayout } from '#/components/layouts/app-layout/index.ts'
import { resolveAppEditionHomeTo } from '#/components/layouts/app-layout/app-nav-config.ts'
import { AppNotFoundPage } from '#/features/not-found/page.tsx'
import { adminHomeTo } from '#/admin/admin-config.ts'
import { resolveSystemEntryHomeTo } from '#/system-entry.ts'
import {
  getAppEdition,
  resolveAppEditionRegistration,
} from '#/app-edition.ts'
import { createHomeRoute } from '#/routes/home-route.ts'
import {
  createAdminHomeRoute,
  createAdminRoute,
} from '#/routes/admin/index.ts'
import { webModules } from '#/vineModules.gen.ts'

const appRouteOutlets = defineWebDomainRouteOutlets({
  admin: 'admin',
  root: 'root',
  shell: 'shell',
})

const RootRoute = createRootRoute()

const appEdition = getAppEdition()
const appEditionRegistration = resolveAppEditionRegistration(
  webModules,
  appEdition,
)

const ShellRoute = createRoute({
  getParentRoute: () => RootRoute,
  id: 'shell',
  component: AppLayout,
})

const AdminRoute = createAdminRoute({ parentRoute: RootRoute })

const appEditionHomeTo = resolveAppEditionHomeTo(webModules, appEdition)
const defaultSystemHomeTo = resolveSystemEntryHomeTo({
  adminHomeTo,
  frontendHomeTo: appEditionHomeTo,
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

const adminDomainRoutes = resolveWebDomainRouteMount({
  domains: webModules,
  outlet: appRouteOutlets.admin,
  parentRoute: AdminRoute,
})

const appEditionRoutes = appEditionRegistration
  ? [
      createHomeRoute({
        defaultTo: appEditionHomeTo,
        parentRoute: RootRoute,
      }),
      ...resolveWebDomainRouteMount({
        domains: webModules,
        outlet: appEditionRegistration.routeMount,
        parentRoute: RootRoute,
      }),
    ]
  : [
      AdminRoute.addChildren([
        createAdminHomeRoute({
          defaultTo: adminHomeTo,
          parentRoute: AdminRoute,
        }),
        ...adminDomainRoutes,
      ]),
      ShellRoute.addChildren([
        createHomeRoute({
          defaultTo: defaultSystemHomeTo,
          parentRoute: ShellRoute,
        }),
        createWorkbenchSidebarDemoRoute({ parentRoute: ShellRoute }),
        ...shellDomainRoutes,
      ]),
    ]

const routeTree = RootRoute.addChildren([
  ...rootDomainRoutes,
  ...appEditionRoutes,
])

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: AppNotFoundPage,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
