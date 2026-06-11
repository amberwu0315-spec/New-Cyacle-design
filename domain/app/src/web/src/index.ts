export { cn } from './lib/utils.ts'
export { queryClient, TanstackQueryRootProvider } from './lib/query-client.tsx'
export { vrpcClient } from './lib/vrpc-client.ts'

export { createAppRouter } from './create-router.ts'
export {
  collectDomainRouteTrees,
  defineDomainRouteSlots,
  defineDomainRouteTree,
  defineLayoutRoutes,
  defineLayoutlessRoutes,
  getDomainRouteBranchFactories,
  resolveDomainRoutes,
} from './routes/helpers/domain-route-tree.ts'
export type {
  AppLayoutDomainMetas,
  DomainNavGroupMeta,
  DomainNavItemMeta,
  DomainNavMeta,
  DomainNavMetaContext,
  DomainNavMetaFactory,
} from './components/layouts/app-layout/index.ts'
export type {
  DomainRouteConfig,
  DomainRouteSlot,
  DomainRouteSlotConfig,
  DomainRouteBranchFactory,
  DomainRouteTree,
  DomainRouteTreeCollection,
  DomainRouteTreeEntrypoint,
  DomainRouteTreeFactory,
} from './routes/helpers/domain-route-tree.ts'
export { mountApp } from './mount.tsx'
