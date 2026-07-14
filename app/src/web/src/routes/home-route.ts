import { createRoute, redirect } from '@tanstack/react-router'
import type { WebRouteHandle } from '@carbonnt-cyacle/web-base'

type HomeRouteDeps = {
  parentRoute: WebRouteHandle
}

export function createHomeRoute({ parentRoute }: HomeRouteDeps) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/',
    beforeLoad: () => {
      throw redirect({ to: '/cfp' })
    },
  })
}
