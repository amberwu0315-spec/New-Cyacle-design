import type { AnyRoute } from '@tanstack/react-router'
import { Outlet, createRoute } from '@tanstack/react-router'

import { AppLayout } from '../components/layouts/app-layout/app-layout'
import type { AppNavConfig } from '../components/layouts/app-layout/nav-config'

type AppLayoutRouteDeps = {
  RootRoute: AnyRoute
  navConfig: AppNavConfig
}

export function createAppLayoutRoute({ RootRoute, navConfig }: AppLayoutRouteDeps) {
  function AppLayoutRouteComponent() {
    return (
      <AppLayout navConfig={navConfig}>
        <Outlet />
      </AppLayout>
    )
  }

  return createRoute({
    getParentRoute: () => RootRoute,
    id: 'app-layout',
    component: AppLayoutRouteComponent,
  })
}
