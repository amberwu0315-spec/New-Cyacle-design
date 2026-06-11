import * as React from 'react'
import type { AnyRoute } from '@tanstack/react-router'
import { Outlet, createRoute } from '@tanstack/react-router'

import { AppLayout } from '../components/layouts/app-layout/app-layout'
import { createAppNavConfig } from '../components/layouts/app-layout/nav-config'
import type { DomainRouteTree } from './helpers/domain-route-tree'
import { useLanguageStore } from '../lib/i18n'

type AppLayoutRouteDeps = {
  RootRoute: AnyRoute
  routeTrees: Array<DomainRouteTree>
}

export function createAppLayoutRoute({ RootRoute, routeTrees }: AppLayoutRouteDeps) {
  function AppLayoutRouteComponent() {
    const language = useLanguageStore()
    const navConfig = React.useMemo(
      () => createAppNavConfig(routeTrees, { language }),
      [language, routeTrees],
    )

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
