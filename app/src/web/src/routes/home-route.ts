import { createRoute } from '@tanstack/react-router'
import type { WebRouteHandle } from '@carbonnt-cyacle/web-base'

import { AppHomePage } from '../features/home/page'

type HomeRouteDeps = {
  parentRoute: WebRouteHandle
}

export function createHomeRoute({ parentRoute }: HomeRouteDeps) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/',
    component: AppHomePage,
  })
}
