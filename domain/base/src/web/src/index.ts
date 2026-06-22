export { cn } from '#/lib/utils.ts';
export { Button } from '#/components/ui/button.tsx';
export { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group.tsx';
export { queryClient, TanstackQueryRootProvider } from '#/lib/query-client.tsx';
export { vrpcClient, vrpcHttpClient } from '#/lib/vrpc-client.ts';
export {
  clearAuthSessionSideEffects,
  redirectToLoginWithCurrentLocation,
} from '#/lib/auth-session.ts';
export {
  configureWebProjectConfig,
  getWebProjectConfig,
} from '#/lib/web-project-config.ts';
export type {
  WebProjectConfig,
  WebProjectDocumentUploadServiceConfig,
  WebProjectFileUploadServiceConfig,
  WebProjectRoutesConfig,
  WebProjectUploadServicesConfig,
} from '#/lib/web-project-config.ts';
export {
  AVATAR_ACCEPTED_IMAGE_TYPES,
  getFileDownloadUrl,
  getFilePublicDownloadUrl,
  uploadPrivateFile,
  uploadPublicFile,
  validateAvatarImageFile,
} from '#/lib/upload-services/file-service.ts';
export type { UploadedFileResource } from '#/lib/upload-services/file-service.ts';
export {
  fetchDocumentDownloadBlob,
  getDocumentDownloadUrl,
  uploadDocumentFile,
} from '#/lib/upload-services/document-service.ts';
export type {
  FetchDocumentDownloadBlobOptions,
  UploadDocumentInput,
  UploadedDocumentResource,
} from '#/lib/upload-services/document-service.ts';
export {
  clearSessionCredential,
  getSessionAuthorizationHeader,
  getSessionCredential,
  getSessionScope,
  getSessionScopeCredential,
  getSessionWorkspaceId,
  setSessionCredential,
  setSessionScope,
  setSessionWorkspaceId,
} from '#/lib/session-cookie.ts';
export {
  createI18nCatalog,
  formatMessage,
  getMessages,
  i18nCatalog,
  languageStore,
  useLanguageStore,
  useTranslation,
} from '#/lib/i18n/index.ts';
export type {
  I18nCatalog,
  I18nCatalogMessages,
  I18nMessageFormatter,
  I18nMessageParams,
  I18nTranslation,
  Messages,
  SupportedLanguage,
} from '#/lib/i18n/index.ts';

export { AppLayout, createAppNavConfig } from '#/components/layouts/app-layout/index.ts';
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
  WorkspaceAutoSelectionResolver,
  WorkspaceSelectionItem,
  WorkspaceSelectionResult,
} from '#/components/layouts/app-layout/index.ts';
export { WorkspaceSelectionDialog } from '#/components/layouts/app-layout/workspace-selection-dialog.tsx';
export { LanguageMenu as LoginLanguageMenu } from '#/components/layouts/app-layout/language-switcher.tsx';
export {
  ModuleLayout,
  ModuleLayout as DomainBaseLayout,
} from '#/components/layouts/module-layout/index.ts';
export type {
  ModuleLayoutProps,
  ModuleLayoutProps as DomainBaseLayoutProps,
} from '#/components/layouts/module-layout/index.ts';
export { BaseProviders } from '#/base-providers.tsx';
export * from '#/components/assistant-workbench/index.ts';
export * from '#/components/common/document-preview/index.ts';
export {
  collectWebDomainCapabilities,
  defineWebDomain,
  defineWebDomainRouteOutlets,
  resolveWebDomainRouteMount,
} from '#/routes/web-domain.ts';
export type {
  WebDomain,
  WebDomainCapabilities,
  WebDomainRouteFactory,
  WebDomainRouteFactoryContext,
  WebDomainRouteMountKey,
  WebDomainRouteMounts,
  WebDomainRouteOutlets,
  WebRouteHandle,
} from '#/routes/web-domain.ts';
