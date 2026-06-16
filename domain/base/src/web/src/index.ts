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
  SESSION_WORKSPACE_ID_COOKIE_KEY,
  clearSessionCredential,
  getSessionCredential,
  getSessionScope,
  getSessionScopeCredential,
  getSessionWorkspaceId,
  resolveSessionCookieDomain,
  setSessionCredential,
  setSessionScope,
  setSessionWorkspaceId,
} from './lib/session-cookie.ts'
export {
  clearWorkspaceSelectionSideEffects,
  fetchAvailableWorkspaces,
  prepareWorkspaceSelectionAfterAuth,
  selectWorkspaceId,
  workspaceKeys,
} from './lib/workspace-session.ts'
export { vrpcClient, vrpcHttpClient } from './lib/vrpc-client.ts'

export type {
  MessageParams,
  Messages,
  SupportedLanguage,
} from './lib/i18n/index.ts'
export type { WorkspaceSelectionItem } from './lib/workspace-session.ts'

export { createAppRouter } from './create-router.ts'
export {
  LanguageSwitcher,
  LanguageMenu as LoginLanguageMenu,
} from './components/layouts/app-layout/language-switcher.tsx'
export { DomainBaseLayout } from './components/layouts/domain-base-layout/index.tsx'
export { WorkspaceSelectionDialog } from './components/layouts/app-layout/workspace-selection-dialog.tsx'
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
export type { DomainBaseLayoutProps } from './components/layouts/domain-base-layout/index.tsx'
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
