export { cn } from '#/lib/utils.ts'
export { Button } from '#/components/ui/button.tsx'
export { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group.tsx'
export { queryClient, TanstackQueryRootProvider } from '#/lib/query-client.tsx'
export { vrpcClient, vrpcHttpClient } from '#/lib/vrpc-client.ts'
export {
  clearAuthSessionSideEffects,
  redirectToLoginWithCurrentLocation,
} from '#/lib/auth-session.ts'
export {
  assertWebProjectConfigConfigured,
  configureWebProjectConfig,
  getWebProjectConfig,
} from '#/lib/web-project-config.ts'
export type {
  WebProjectConfig,
  WebProjectDocumentUploadServiceConfig,
  WebProjectFileUploadServiceConfig,
  WebProjectRoutesConfig,
  WebProjectUploadServicesConfig,
} from '#/lib/web-project-config.ts'
export {
  AVATAR_ACCEPTED_IMAGE_TYPES,
  getFileDownloadUrl,
  getFilePublicDownloadUrl,
  uploadPrivateFile,
  uploadPublicFile,
  validateAvatarImageFile,
} from '#/lib/upload-services/file-service.ts'
export type { UploadedFileResource } from '#/lib/upload-services/file-service.ts'
export {
  fetchDocumentDownloadBlob,
  getDocumentDownloadUrl,
  uploadDocumentFile,
} from '#/lib/upload-services/document-service.ts'
export type {
  FetchDocumentDownloadBlobOptions,
  UploadDocumentInput,
  UploadedDocumentResource,
} from '#/lib/upload-services/document-service.ts'
export {
  clearSessionCredential,
  getSessionAuthorizationHeader,
  getSessionCredential,
  getSessionScope,
  getSessionScopeCredential,
  setSessionCredential,
  setSessionScope,
} from '#/lib/session-cookie.ts'
export {
  clearWorkspaceSelectionSideEffects,
  selectWorkspaceId,
} from '#/lib/workspace-session.ts'
export type { WorkspaceSelectionItem } from '#/lib/workspace-session.ts'
export {
  formatMessage,
  getMessages,
  languageStore,
  useLanguageStore,
  useTranslation,
} from '#/lib/i18n/index.ts'
export type {
  Messages,
  MessageParams,
  SupportedLanguage,
} from '#/lib/i18n/index.ts'

export {
  AppLayout,
  createAppNavConfig,
} from '#/components/layouts/app-layout/index.ts'
export type {
  AppLayoutDomainCapabilities,
  AppLayoutAsyncState,
  AppLayoutProps,
  AppLayoutUserProfile,
  AppNavConfig,
  AppNavConfigOptions,
  DomainNavGroupMeta,
  DomainNavItemMeta,
  DomainNavMeta,
  DomainNavMetaContext,
  DomainNavMetaFactory,
} from '#/components/layouts/app-layout/index.ts'
export { WorkspaceSelectionDialog } from '#/components/layouts/app-layout/workspace-selection-dialog.tsx'
export { LanguageMenu as LoginLanguageMenu } from '#/components/layouts/app-layout/language-switcher.tsx'
export { ModuleLayout } from '#/components/layouts/module-layout/index.ts'
export type { ModuleLayoutProps } from '#/components/layouts/module-layout/index.ts'
export { BaseProviders } from '#/base-providers.tsx'
export {
  collectWebDomainCapabilities,
  defineWebDomain,
  defineWebDomainRouteOutlets,
  resolveWebDomainRouteMount,
} from '#/routes/web-domain.ts'
export type {
  WebDomain,
  WebDomainCapabilities,
  WebDomainRouteFactory,
  WebDomainRouteFactoryContext,
  WebDomainRouteMountKey,
  WebDomainRouteMounts,
  WebDomainRouteOutlets,
  WebRouteHandle,
} from '#/routes/web-domain.ts'
