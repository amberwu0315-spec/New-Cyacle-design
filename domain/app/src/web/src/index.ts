export { cn } from './lib/utils.ts'
export {
  formatMessage,
  getMessages,
  languageStore,
  useLanguageStore,
  useTranslation,
} from './lib/i18n/index.ts'
export { queryClient, TanstackQueryRootProvider } from './lib/query-client.tsx'
export {
  SESSION_COOKIE_KEY,
  SESSION_SCOPE_COOKIE_KEY,
  SESSION_SCOPE_CREDENTIAL_EMPTY,
  clearSessionCredential,
  getSessionCredential,
  getSessionScope,
  getSessionScopeCredential,
  resolveSessionCookieDomain,
  setSessionCredential,
  setSessionScope,
} from './lib/session-cookie.ts'
export { vrpcClient } from './lib/vrpc-client.ts'

export type {
  MessageParams,
  Messages,
  SupportedLanguage,
} from './lib/i18n/index.ts'

export { createAppRouter } from './create-router.ts'
export { LanguageSwitcher } from './components/layouts/app-layout/language-switcher.tsx'
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
