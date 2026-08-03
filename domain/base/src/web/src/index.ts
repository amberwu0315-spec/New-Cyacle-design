export { cn } from '#/lib/utils.ts';
export { Button } from '#/components/ui/button.tsx';
export { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group.tsx';
export { KatexFormula } from '#/components/common/katex-formula.tsx';
export type { KatexFormulaProps } from '#/components/common/katex-formula.tsx';
export { SelectedFileItem } from '#/components/common/selected-file-item.tsx';
export type { SelectedFileItemProps } from '#/components/common/selected-file-item.tsx';
export {
  createDocumentPreviewItem,
  createDocumentPreviewItemFromDocument,
  createDocumentPreviewItemFromVersion,
  createFilePreviewItem,
  InlineDocumentPreview,
  openDocumentPreview,
} from '#/components/common/document-preview/index.ts';
export type {
  DocumentsPreviewDocumentEntry,
  DocumentsPreviewItem,
  DocumentsPreviewSource,
  DocumentsPreviewVersion,
  InlineDocumentPreviewProps,
} from '#/components/common/document-preview/index.ts';
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
export type {
  UploadedFileResource,
} from '#/lib/upload-services/file-service.ts';
export {
  fetchFileDownloadBlob,
} from '#/lib/upload-services/core/file-service.ts';
export type {
  FetchFileDownloadBlobOptions,
} from '#/lib/upload-services/core/file-service.ts';
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
  setSessionCredential,
  setSessionScope,
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
export {
  DEFAULT_PLAIN_TEXT_ITEM_TYPE,
  DEFAULT_FORMULA_FUNCTIONS,
  FormulaEditor,
  ReplaceDisplay,
  ReplaceEditor,
  collectReferencedVariables,
  validateFormula,
} from '@cew-lib/cyacle-replace-symbols';
export { renderToString as renderKatexToString } from 'katex';
export type {
  FormulaEditorValue,
  FormulaEditorToolbarApi,
  FormulaFunctionOption,
  FormulaSuggestionSection,
  FormulaVariableSection,
  ReplaceSuggestionSection,
  ReplaceTokenOption,
  ReplaceValueSegment,
} from '@cew-lib/cyacle-replace-symbols';

export {
  AppLayout,
  createAppNavConfig,
  useAppLayoutBreadcrumbs,
} from '#/components/layouts/app-layout/index.ts';
export type {
  AppLayoutBreadcrumbItems,
  AppLayoutBreadcrumbsContextValue,
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
export {
  AdminLayout,
  createAdminPermissionCodes,
  createAdminNavigation,
  resolveAdminHomeTo,
} from '#/components/layouts/admin-layout/index.ts';
export type {
  AdminLayoutDomainCapabilities,
  AdminLayoutProps,
  AdminNavMetaContext,
  AdminNavMetaFactory,
  AdminNavigationGroup,
  AdminNavigationItem,
} from '#/components/layouts/admin-layout/index.ts';
export { BaseProviders } from '#/base-providers.tsx';
export * from '#/components/assistant-workbench/index.ts';
export {
  AppShellFrame,
  AppShellFrameBreadcrumbs,
  AppShellFrameBody,
  AppShellFrameContent,
  AppShellFrameMain,
  AppShellFrameNav,
  AppShellFrameOverlays,
  AppShellFrameRoot,
  AppShellFrameSidebar,
  AppShellFrameSidebarBrand,
  AppShellFrameSidebarNav,
  AppShellFrameSidebarTrigger,
  AppShellFrameTopbar,
  AppShellFrameTopbarEnd,
  AppShellFrameTopbarStart,
  useAppShellFrame,
  useAppShellFrameNav,
} from '#/components/common/app-shell-frame/index.ts';
export type {
  AppShellBreadcrumbItem,
  AppShellFrameBreadcrumbsProps,
  AppShellFrameBodyProps,
  AppShellFrameContentProps,
  AppShellFrameContextValue,
  AppShellFrameMainProps,
  AppShellFrameNavContextValue,
  AppShellFrameNavProps,
  AppShellFrameOverlaysProps,
  AppShellFrameProps,
  AppShellFrameRootProps,
  AppShellFrameSidebarBrandProps,
  AppShellFrameSidebarNavLabels,
  AppShellFrameSidebarNavProps,
  AppShellFrameSidebarProps,
  AppShellFrameSidebarTriggerLabels,
  AppShellFrameSidebarTriggerProps,
  AppShellSidebarState,
  AppShellFrameTopbarEndProps,
  AppShellFrameTopbarProps,
  AppShellFrameTopbarStartProps,
  AppShellIcon,
  AppShellNavConfig,
  AppShellNavGroup,
  AppShellNavItem,
  AppShellScene,
  AppShellSceneCategory,
} from '#/components/common/app-shell-frame/index.ts';
export * from '#/components/common/document-preview/index.ts';
export * from '#/components/common/workbench-sidebar/index.ts';
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
