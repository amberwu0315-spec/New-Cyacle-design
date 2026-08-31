import '#/project-config.ts'

import { createRootRoute, createRoute } from '@tanstack/react-router'
import {
  createWebRouter,
  createWorkbenchSidebarDemoRoute,
} from '@carbonnt-cyacle/web-base'

import { AdminAppLayout } from '#/components/layouts/admin-layout/index.ts'
import { AppLayout } from '#/components/layouts/app-layout/index.ts'
import { AppRoutePendingFallback } from '#/components/routes/app-route-pending-fallback.tsx'
import {
  AppRouteErrorPage,
  reportRouteError,
} from '#/features/route-error/page.tsx'
import { AppNotFoundPage } from '#/features/not-found/page.tsx'
import { resolveDefaultSystemHomeTo } from '#/app-route-navigation.ts'
import { createAdminHomeRoute } from '#/routes/admin/index.ts'
import { createHomeRoute } from '#/routes/home-route.ts'
import { webModules } from '#/vineModules.gen.ts'

const domainProfiles = {
  standard: webModules,
} as const

const standardDomains = domainProfiles.standard

const rootRoute = createRootRoute({
  notFoundComponent: AppNotFoundPage,
})

const webRouter = createWebRouter({
  rootRoute,
  domains: standardDomains,
  rootOutlets: {
    app: createRoute({
      getParentRoute: () => rootRoute,
      id: 'app',
      component: AppLayout,
    }),
    admin: createRoute({
      getParentRoute: () => rootRoute,
      id: 'admin',
      component: AdminAppLayout,
    }),
  },
  routes: ({ app, admin }) => {
    const homeRoute = createHomeRoute({
      defaultTo: resolveDefaultSystemHomeTo,
      parentRoute: app,
    })
    const workbenchSidebarDemoRoute = createWorkbenchSidebarDemoRoute({
      parentRoute: app,
    })
    const adminHomeRoute = createAdminHomeRoute({ parentRoute: admin })

    return {
      app: [homeRoute, workbenchSidebarDemoRoute],
      admin: [adminHomeRoute],
    }
  },
  router: {
    defaultNotFoundComponent: AppNotFoundPage,
    defaultErrorComponent: AppRouteErrorPage,
    defaultOnCatch: reportRouteError,
    defaultPendingComponent: AppRoutePendingFallback,
    defaultPendingMinMs: 300,
    defaultPendingMs: 150,
  },
})

export const { outlets, webDomains, routeTree, router } = webRouter

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
