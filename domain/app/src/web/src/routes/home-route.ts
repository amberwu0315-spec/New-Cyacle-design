import type { AnyRoute } from '@tanstack/react-router'
import { createRoute } from '@tanstack/react-router'

import { AppHomePage } from '../features/home/page'

type HomeRouteDeps = {
  RootRoute: AnyRoute
}

export function createHomeRouteTree({ RootRoute }: HomeRouteDeps) {
  return createRoute({
    getParentRoute: () => RootRoute,
    path: '/',
    component: AppHomePage,
  })
}
