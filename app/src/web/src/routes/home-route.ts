import { createRoute, redirect, type AnyRoute } from '@tanstack/react-router'

type HomeRouteDeps<TParentRoute extends AnyRoute> = {
  defaultTo: string | (() => string | Promise<string>)
  parentRoute: TParentRoute
}

export function createHomeRoute<const TParentRoute extends AnyRoute>({
  defaultTo,
  parentRoute,
}: HomeRouteDeps<TParentRoute>) {
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
