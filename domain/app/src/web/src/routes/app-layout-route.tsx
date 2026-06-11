import type { AnyRoute } from '@tanstack/react-router'
import { Outlet, createRoute } from '@tanstack/react-router'

import { AppLayout } from '../components/layouts/app-layout/app-layout'

type AppLayoutRouteDeps = {
  RootRoute: AnyRoute
}

function AppLayoutRouteComponent() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export function createAppLayoutRoute({ RootRoute }: AppLayoutRouteDeps) {
  return createRoute({
    getParentRoute: () => RootRoute,
    id: 'app-layout',
    component: AppLayoutRouteComponent,
  })
}
