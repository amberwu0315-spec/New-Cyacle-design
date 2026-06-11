import { createRouter } from '@tanstack/react-router'

import { createAppRouteTree, type DomainRouteTreeFactory } from './routes/index.tsx'

export function createAppRouter(factories: DomainRouteTreeFactory[]) {
  return createRouter({
    routeTree: createAppRouteTree(factories),
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })
}

