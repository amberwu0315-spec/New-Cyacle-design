import { createRoute, redirect } from '@tanstack/react-router'
import type { WebRouteHandle } from '@carbonnt-cyacle/web-base'

type HomeRouteDeps = {
  defaultTo: string
  parentRoute: WebRouteHandle
}

export function createHomeRoute({ defaultTo, parentRoute }: HomeRouteDeps) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/',
    beforeLoad: () => {
      throw redirect({ to: defaultTo })
    },
  })
}
