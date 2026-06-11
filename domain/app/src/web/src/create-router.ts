import { createRouter } from '@tanstack/react-router'

import type { DomainRouteTreeEntrypoint } from './routes/helpers/domain-route-tree.ts'
import { collectDomainRouteTrees } from './routes/helpers/domain-route-tree.ts'
import { createAppRouteTree } from './routes/index.tsx'

export function createAppRouter(routeTreeEntrypoints: Array<DomainRouteTreeEntrypoint>) {
  const domainRouteTrees = collectDomainRouteTrees(routeTreeEntrypoints)

  return createRouter({
    routeTree: createAppRouteTree(domainRouteTrees),
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })
}
