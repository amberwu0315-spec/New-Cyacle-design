import '#/project-config.ts'

import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import {
  createWorkbenchSidebarDemoRoute,
  defineWebDomainRouteOutlets,
  resolveWebDomainRouteMount,
} from '@carbonnt-cyacle/web-base'
import {
  ensurePermissions,
  fetchOrganizationProfile,
  getSelectedWorkspaceScope,
} from '@carbonnt-cyacle/web-uic/pub'

import { AppLayout } from '#/components/layouts/app-layout/index.ts'
import {
  DEFAULT_APP_HOME_TO,
  createConfiguredAppNavConfig,
  resolveAppEditionHomeTo,
} from '#/components/layouts/app-layout/app-nav-config.ts'
import { AppRoutePendingFallback } from '#/components/routes/app-route-pending-fallback.tsx'
import {
  AppRouteErrorPage,
  reportRouteError,
} from '#/features/route-error/page.tsx'
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
import { appPermissionCodes } from '#/app-permissions.ts'

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

async function resolveDefaultSystemHomeTo() {
  let frontendHomeTo = DEFAULT_APP_HOME_TO

  try {
    const permissionCodeMap = await ensurePermissions({
      codes: appPermissionCodes,
      suppressGlobalToast: true,
      workspaceScope: getSelectedWorkspaceScope(),
    })
    const navConfig = createConfiguredAppNavConfig(
      webModules,
      { permissionCodeMap },
      appEdition,
    )
    const hasDefaultSystemHome = navConfig.scenes.some((scene) =>
      scene.groups.some((group) =>
        group.items.some((item) => item.to === DEFAULT_APP_HOME_TO),
      ),
    )

    frontendHomeTo = hasDefaultSystemHome
      ? DEFAULT_APP_HOME_TO
      : (navConfig.scenes[0]?.defaultTo ?? appEditionHomeTo)
  } catch {
    // 权限加载失败时沿用默认入口，具体页面仍由权限守卫处理。
  }

  try {
    const organizationProfile = await fetchOrganizationProfile({
      suppressGlobalToast: true,
    })

    return resolveSystemEntryHomeTo({
      adminHomeTo,
      businessCodes: organizationProfile?.businessCodes,
      frontendHomeTo,
    })
  } catch {
    return frontendHomeTo
  }
}

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
          parentRoute: AdminRoute,
        }),
        ...adminDomainRoutes,
      ]),
      ShellRoute.addChildren([
        createHomeRoute({
          defaultTo: resolveDefaultSystemHomeTo,
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
  defaultErrorComponent: AppRouteErrorPage,
  defaultOnCatch: reportRouteError,
  defaultPendingComponent: AppRoutePendingFallback,
  defaultPendingMinMs: 300,
  defaultPendingMs: 150,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
