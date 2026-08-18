import { createRoute, redirect } from '@tanstack/react-router'
import type { WebRouteHandle } from '@carbonnt-cyacle/web-base'

type HomeRouteDeps = {
  defaultTo: string | (() => string | Promise<string>)
  parentRoute: WebRouteHandle
}

export function createHomeRoute({ defaultTo, parentRoute }: HomeRouteDeps) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/',
    beforeLoad: async () => {
      const resolvedDefaultTo =
        typeof defaultTo === 'function' ? await defaultTo() : defaultTo

      throw redirect({ to: resolvedDefaultTo })
    },
  })
}
