import '#/project-config.ts'

import { createRootRoute, createRoute } from '@tanstack/react-router'
import {
  createWebRouter,
  createWorkbenchSidebarDemoRoute,
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

const rootRoute = createRootRoute({
  notFoundComponent: AppNotFoundPage,
})

const appEdition = getAppEdition()
const appEditionRegistration = resolveAppEditionRegistration(
  webModules,
  appEdition,
)
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

function createStandardWebRouter() {
  const appRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'app',
    component: AppLayout,
  })
  const adminRoute = createAdminRoute({ parentRoute: rootRoute })
  const standardDomains = webModules.filter(
    (domain) => domain.id !== 'wuxibiologics',
  )

  return createWebRouter({
    rootRoute,
    domains: standardDomains,
    rootOutlets: {
      app: appRoute,
      admin: adminRoute,
      wuxibiologics: null,
    },
    routes: ({ app, admin }) => ({
      app: [
        createHomeRoute({
          defaultTo: resolveDefaultSystemHomeTo,
          parentRoute: app!,
        }),
        createWorkbenchSidebarDemoRoute({ parentRoute: app! }),
      ],
      admin: [createAdminHomeRoute({ parentRoute: admin! })],
    }),
    router: {
      defaultNotFoundComponent: AppNotFoundPage,
      defaultErrorComponent: AppRouteErrorPage,
      defaultOnCatch: reportRouteError,
      defaultPendingComponent: AppRoutePendingFallback,
      defaultPendingMinMs: 300,
      defaultPendingMs: 150,
    },
  })
}

function createEditionWebRouter() {
  if (!appEditionRegistration) {
    throw new Error(`App edition "${appEdition}" is not registered.`)
  }

  const editionRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: appEditionRegistration.routeMount,
    component: () => null,
  })
  const editionDomains = webModules.filter(
    (domain) => domain.id === appEditionRegistration.id,
  )

  return createWebRouter({
    rootRoute,
    domains: editionDomains,
    rootOutlets: {
      app: null,
      admin: null,
      wuxibiologics: editionRoute,
    },
    routes: ({ root }) => ({
      root: [
        createHomeRoute({ defaultTo: appEditionHomeTo, parentRoute: root }),
      ],
    }),
    router: {
      defaultNotFoundComponent: AppNotFoundPage,
      defaultErrorComponent: AppRouteErrorPage,
      defaultOnCatch: reportRouteError,
      defaultPendingComponent: AppRoutePendingFallback,
      defaultPendingMinMs: 300,
      defaultPendingMs: 150,
    },
  })
}

const webRouter = appEditionRegistration
  ? createEditionWebRouter()
  : createStandardWebRouter()

export const { outlets, webDomains, routeTree, router } = webRouter

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
