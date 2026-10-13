import * as React from 'react'
import { FileClock, FileText, History, RotateCcw } from 'lucide-react'
import { UnsupportedContent, ViewerIconButton } from '@cew-lib/file-viewer-base'
import type {
  ViewerContentProps,
  ViewerFile,
  ViewerImageFileOptions,
} from '@cew-lib/file-viewer-base'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { ScrollArea } from '#/components/ui/scroll-area.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'
import { toast } from '#/components/ui/toast.tsx'

import { cn } from '#/lib/utils.ts'
import { fetchDocumentBlobByUrl } from '#/lib/upload-services/core/document-service.ts'
import { getMessages, languageStore, useTranslation } from '#/lib/i18n/index.ts'
import type { Messages } from '#/lib/i18n/index.ts'

import {
  formatDocumentDate,
  formatDocumentFileSize,
} from './document-preview-utils'
import {
  resolveDocumentPreviewViewerOptions,
  useDocumentPreviewExtensions,
  useDocumentPreviewViewerOptionsVersion,
} from './document-preview-extensions'
import type { DocumentPreviewExtensionViewerOptions } from './document-preview-extensions'
import { createDocumentPreviewItemFromVersion } from './documents-preview'
import type {
  DocumentsPreviewItem,
  DocumentsPreviewVersion,
} from './documents-preview'

const PDFContent = React.lazy(() =>
  import('@cew-lib/file-viewer-pdf').then((module) => ({
    default: module.PDFContent,
  })),
)
const ImageContent = React.lazy(() =>
  import('@cew-lib/file-viewer-image').then((module) => ({
    default: module.ImageContent,
  })),
)
const VideoContent = React.lazy(() =>
  import('@cew-lib/file-viewer-video').then((module) => ({
    default: module.VideoContent,
  })),
)
const ExcelContent = React.lazy(() =>
  import('@cew-lib/file-viewer-excel').then((module) => ({
    default: module.ExcelContent,
  })),
)

const EMPTY_DOCUMENT_PREVIEW_VERSIONS: Array<DocumentsPreviewVersion> = []

interface AuthorizedDocumentPreviewState {
  error: string | null
  loading: boolean
  objectUrl: string | null
}

const AUTHORIZED_DOCUMENT_PREVIEW_IDLE_STATE: AuthorizedDocumentPreviewState = {
  error: null,
  loading: false,
  objectUrl: null,
}

export interface DocumentPreviewDialogProps {
  open: boolean
  item: DocumentsPreviewItem | null
  onOpenChange: (open: boolean) => void
  onDownload?: (item: DocumentsPreviewItem, useRawVersion?: boolean) => void
  onRollbackVersion?: (input: {
    id: string
    version: string
  }) => Promise<unknown> | unknown
  onVersionRestored?: () => void
  rollbackPending?: boolean
  versions?: Array<DocumentsPreviewVersion>
  versionsLoading?: boolean
  onVersionsRefresh?: () => void
}

type DocumentPreviewMessages = Messages['common']['documentPreview']

function getVersionLabel(
  version: DocumentsPreviewVersion,
  messages: DocumentPreviewMessages,
) {
  return version.version || messages.unknownVersion
}

function isSameVersion(
  a?: DocumentsPreviewVersion | null,
  b?: DocumentsPreviewVersion | null,
) {
  return Boolean(a?.version && b?.version && a.version === b.version)
}

function DocumentPreviewVersionPanel({
  currentVersion,
  canRecoverVersion,
  latestVersion,
  loading,
  onRecover,
  onSelectVersion,
  recovering,
  versions,
  messages,
}: {
  currentVersion: DocumentsPreviewVersion | null
  canRecoverVersion: boolean
  latestVersion: DocumentsPreviewVersion | null
  loading: boolean
  onRecover: () => void
  onSelectVersion: (version: DocumentsPreviewVersion) => void
  recovering: boolean
  versions: Array<DocumentsPreviewVersion>
  messages: DocumentPreviewMessages
}) {
  const canRecover = Boolean(
    canRecoverVersion &&
      currentVersion &&
      latestVersion &&
      !isSameVersion(currentVersion, latestVersion),
  )

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <History className="size-4" />
          {messages.versionHistory}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!canRecover || recovering}
          onClick={onRecover}
        >
          <RotateCcw className="size-4" />
          {messages.restore}
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            {messages.loadingVersions}
          </div>
        ) : versions.length ? (
          <div className="flex flex-col gap-2 p-3">
            {versions.map((version, index) => {
              const active = currentVersion?.version === version.version
              const isRaw = version.version === version.rawVersion

              return (
                <button
                  key={version.version || index}
                  type="button"
                  className={cn(
                    'flex w-full flex-col gap-2 rounded-md border p-3 text-left transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40',
                  )}
                  onClick={() => onSelectVersion(version)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {getVersionLabel(version, messages)}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      {index === 0 ? (
                        <Badge variant="secondary">{messages.current}</Badge>
                      ) : null}
                      {isRaw ? (
                        <Badge variant="outline">{messages.original}</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDocumentDate(version.createdAt ?? null)}
                  </div>
                  <div className="min-w-0 truncate text-xs text-muted-foreground">
                    {version.creator?.name || '-'} {version.comments || ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDocumentFileSize(
                      version.size == null ? null : Number(version.size),
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <FileClock className="size-6" />
            {messages.noVersionHistory}
          </div>
        )}
      </ScrollArea>
    </aside>
  )
}

function DocumentPreviewContent(props: ViewerContentProps) {
  const viewerKind = props.file?.viewerKind

  if (viewerKind === 'pdf') {
    return <PDFContent {...props} />
  }

  if (viewerKind === 'image') {
    return <ImageContent {...props} />
  }

  if (viewerKind === 'video') {
    return <VideoContent {...props} />
  }

  if (viewerKind === 'excel') {
    return <ExcelContent {...props} />
  }

  return <UnsupportedContent {...props} />
}

/** 把扩展提供的图片 viewer 配置（如 OCR 块）合并进 viewerFile.image。 */
function withExtensionImageViewerOptions(
  file: ViewerFile | null,
  image: ViewerImageFileOptions | undefined,
) {
  if (!file || !image) {
    return file
  }

  return { ...file, image: { ...file.image, ...image } }
}

function getPreviewErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return getMessages(
    languageStore.getSnapshot(),
  ).common.documentPreview.loadFailedMessage
}

function createObjectUrl(blob: Blob) {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error(
      getMessages(
        languageStore.getSnapshot(),
      ).common.documentPreview.unsupportedEnvironment,
    )
  }

  return URL.createObjectURL(blob)
}

function revokeObjectUrl(objectUrl: string | null) {
  if (
    objectUrl &&
    typeof URL !== 'undefined' &&
    typeof URL.revokeObjectURL === 'function'
  ) {
    URL.revokeObjectURL(objectUrl)
  }
}

function withViewerObjectUrl(
  item: DocumentsPreviewItem,
  objectUrl: string | null,
): DocumentsPreviewItem {
  if (!objectUrl) {
    return {
      ...item,
      url: undefined,
      viewerFile: {
        ...item.viewerFile,
        url: undefined,
      },
    }
  }

  return {
    ...item,
    url: objectUrl,
    viewerFile: {
      ...item.viewerFile,
      url: objectUrl,
    },
  }
}

function isRelativeUrl(url: string) {
  return url.startsWith('/')
}

function isSameOriginUrl(url: string) {
  if (isRelativeUrl(url)) {
    return true
  }

  if (typeof window === 'undefined') {
    return false
  }

  try {
    return new URL(url, window.location.href).origin === window.location.origin
  } catch {
    return false
  }
}

function shouldFetchAuthorizedPreviewUrl(item: DocumentsPreviewItem | null) {
  if (!item?.url) {
    return false
  }

  if (item.source === 'document') {
    return true
  }

  return item.source === 'file' && isSameOriginUrl(item.url)
}

function useAuthorizedDocumentPreviewItem(
  open: boolean,
  item: DocumentsPreviewItem | null,
) {
  const [state, setState] = React.useState<AuthorizedDocumentPreviewState>(
    AUTHORIZED_DOCUMENT_PREVIEW_IDLE_STATE,
  )
  const authorizedPreviewUrl =
    open && shouldFetchAuthorizedPreviewUrl(item) ? item?.url : undefined

  React.useEffect(() => {
    if (!authorizedPreviewUrl) {
      setState(AUTHORIZED_DOCUMENT_PREVIEW_IDLE_STATE)
      return undefined
    }

    const abortController = new AbortController()
    let objectUrl: string | null = null

    setState({ error: null, loading: true, objectUrl: null })

    void fetchDocumentBlobByUrl(authorizedPreviewUrl, {
      signal: abortController.signal,
    })
      .then((blob) => {
        if (abortController.signal.aborted) {
          return
        }

        objectUrl = createObjectUrl(blob)
        setState({ error: null, loading: false, objectUrl })
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        setState({
          error: getPreviewErrorMessage(error),
          loading: false,
          objectUrl: null,
        })
      })

    return () => {
      abortController.abort()
      revokeObjectUrl(objectUrl)
    }
  }, [authorizedPreviewUrl])

  return React.useMemo(() => {
    if (!shouldFetchAuthorizedPreviewUrl(item)) {
      return {
        error: null,
        item,
        loading: false,
      }
    }

    return {
      error: state.error,
      item: item ? withViewerObjectUrl(item, state.objectUrl) : null,
      loading: state.loading,
    }
  }, [item, state.error, state.loading, state.objectUrl])
}

function DocumentPreviewLoadingState({
  messages,
}: {
  messages: DocumentPreviewMessages
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
      <Spinner className="size-5" />
      {messages.loadingDocument}
    </div>
  )
}

function DocumentPreviewErrorState({
  message,
  messages,
}: {
  message: string
  messages: DocumentPreviewMessages
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
      <FileText className="size-8" />
      <div className="font-medium text-foreground">{messages.loadFailedTitle}</div>
      <div className="max-w-md leading-relaxed">{message}</div>
    </div>
  )
}

export function DocumentPreviewDialog({
  open,
  item,
  onOpenChange,
  onDownload,
  onRollbackVersion,
  onVersionRestored,
  rollbackPending = false,
  versions = EMPTY_DOCUMENT_PREVIEW_VERSIONS,
  versionsLoading = false,
  onVersionsRefresh,
}: DocumentPreviewDialogProps) {
  const { t: messages } = useTranslation()
  const previewMessages = messages.common.documentPreview
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [activeExtensionId, setActiveExtensionId] = React.useState<string | null>(
    null,
  )
  const [selectedVersion, setSelectedVersion] =
    React.useState<DocumentsPreviewVersion | null>(null)
  const [recoverVersion, setRecoverVersion] =
    React.useState<DocumentsPreviewVersion | null>(null)
  const latestVersion = versions[0] ?? null
  const effectiveItem = React.useMemo(() => {
    if (item?.source !== 'document' || !selectedVersion) {
      return item
    }

    return createDocumentPreviewItemFromVersion(item, selectedVersion)
  }, [item, selectedVersion])
  const authorizedPreview = useAuthorizedDocumentPreviewItem(open, effectiveItem)
  const extensions = useDocumentPreviewExtensions()
  const previewFile = authorizedPreview.item?.viewerFile ?? null
  const extensionContext = React.useMemo(
    () => ({
      file: previewFile,
      item,
      open,
      viewerKind: previewFile?.viewerKind ?? null,
    }),
    [item, open, previewFile],
  )
  const availableExtensions = extensions.filter(
    (extension) => !extension.match || extension.match(extensionContext),
  )
  const activeExtension =
    availableExtensions.find(
      (extension) => extension.id === activeExtensionId,
    ) ?? null
  const viewerOptionsVersion = useDocumentPreviewViewerOptionsVersion()
  const extensionViewerOptions = React.useMemo(() => {
    void viewerOptionsVersion

    return availableExtensions.reduce<DocumentPreviewExtensionViewerOptions>(
      (merged, extension) => {
        const options = resolveDocumentPreviewViewerOptions(
          extension,
          extensionContext,
        )

        return options ? { ...merged, ...options } : merged
      },
      {},
    )
  }, [availableExtensions, extensionContext, viewerOptionsVersion])
  const extensionViewerExcelOptions = extensionViewerOptions.excel
  const extensionViewerImageOptions = extensionViewerOptions.image
  const buildExtensionRenderContext = React.useCallback(
    (extensionId: string, active: boolean) => ({
      ...extensionContext,
      active,
      activate: () => {
        setActiveExtensionId(extensionId)
        setHistoryOpen(false)
      },
      deactivate: () => {
        setActiveExtensionId((current) =>
          current === extensionId ? null : current,
        )
      },
      toggle: () => {
        setActiveExtensionId((current) =>
          current === extensionId ? null : extensionId,
        )
        setHistoryOpen(false)
      },
    }),
    [extensionContext],
  )

  React.useEffect(() => {
    setHistoryOpen(false)
    setActiveExtensionId(null)
    setSelectedVersion(null)
    setRecoverVersion(null)
  }, [item?.id])

  React.useEffect(() => {
    if (!item || selectedVersion || versions.length === 0) {
      return
    }

    const matched = versions.find((version) => version.version === item.version)

    setSelectedVersion(matched ?? versions[0])
  }, [item, selectedVersion, versions])

  const renderExtensionToolbarActions = () =>
    availableExtensions.map((extension) => {
      const active = extension.id === activeExtensionId
      const context = buildExtensionRenderContext(extension.id, active)

      if (extension.toolbarAction) {
        const action = extension.toolbarAction(context)

        return (
          <ViewerIconButton
            key={extension.id}
            label={action.label}
            pressed={active}
            onClick={context.toggle}
          >
            {action.icon}
          </ViewerIconButton>
        )
      }

      if (!extension.renderToolbarAction) {
        return null
      }

      return (
        <React.Fragment key={extension.id}>
          {extension.renderToolbarAction(context)}
        </React.Fragment>
      )
    })

  const toolbar: ViewerContentProps['toolbar'] = {
    renderActions: ({ defaultActions }) => (
      <>
        {renderExtensionToolbarActions()}
        {item?.source === 'document' ? (
          <ViewerIconButton
            label={previewMessages.versionHistory}
            pressed={historyOpen}
            onClick={() => {
              setHistoryOpen((currentOpen) => !currentOpen)
              setActiveExtensionId(null)
            }}
          >
            <History className="size-4" />
          </ViewerIconButton>
        ) : null}
        {item?.source === 'document' && onDownload ? (
          <ViewerIconButton
            label={previewMessages.downloadOriginalDocument}
            onClick={() => {
              if (!effectiveItem) {
                return
              }

              onDownload(effectiveItem, true)
            }}
          >
            <FileText className="size-4" />
          </ViewerIconButton>
        ) : null}
        {defaultActions}
      </>
    ),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-0 !left-0 flex h-svh max-h-svh w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:!max-w-none">
        <DialogHeader className="h-12 shrink-0 justify-center px-5 pr-12">
          <DialogTitle>{previewMessages.dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 overflow-hidden bg-muted/20">
          <div className="relative min-w-0 flex-1 overflow-hidden">
            {authorizedPreview.loading ? (
              <DocumentPreviewLoadingState messages={previewMessages} />
            ) : authorizedPreview.error ? (
              <DocumentPreviewErrorState
                message={authorizedPreview.error}
                messages={previewMessages}
              />
            ) : (
              <React.Suspense
                fallback={
                  <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    {previewMessages.loadingViewer}
                  </div>
                }
              >
                <DocumentPreviewContent
                  file={withExtensionImageViewerOptions(
                    authorizedPreview.item?.viewerFile ?? null,
                    extensionViewerImageOptions,
                  )}
                  excel={extensionViewerExcelOptions}
                  toolbar={toolbar}
                  className="h-full"
                  classNames={{
                    root: 'documents-preview-viewer h-full border-0 rounded-none [&>header>div:first-child]:hidden',
                  }}
                />
              </React.Suspense>
            )}
            {activeExtension?.renderViewerOverlay
              ? activeExtension.renderViewerOverlay(
                  buildExtensionRenderContext(activeExtension.id, true),
                )
              : null}
          </div>
          {activeExtension?.renderSidePanel
            ? activeExtension.renderSidePanel(
                buildExtensionRenderContext(activeExtension.id, true),
              )
            : historyOpen && item?.source === 'document' ? (
                <DocumentPreviewVersionPanel
                  canRecoverVersion={Boolean(onRollbackVersion)}
                  currentVersion={selectedVersion}
                  latestVersion={latestVersion}
                  loading={versionsLoading}
                  recovering={rollbackPending}
                  versions={versions}
                  onSelectVersion={setSelectedVersion}
                  onRecover={() => setRecoverVersion(selectedVersion)}
                  messages={previewMessages}
                />
              ) : null}
        </div>
        <AlertDialog
          open={Boolean(recoverVersion)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setRecoverVersion(null)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {previewMessages.restoreConfirmTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {previewMessages.restoreConfirmDescription(
                  recoverVersion?.version || '-',
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{messages.common.actions.cancel}</AlertDialogCancel>
              <AlertDialogAction
                disabled={rollbackPending || !onRollbackVersion}
                onClick={async () => {
                  if (!item || !recoverVersion || !onRollbackVersion) {
                    return
                  }

                  try {
                    await onRollbackVersion({
                      id: item.id,
                      version: recoverVersion.version,
                    })
                    toast.add({
                      type: 'success',
                      description: previewMessages.restoreSuccess,
                    })
                    setRecoverVersion(null)
                    setSelectedVersion(null)
                    onVersionRestored?.()
                    onVersionsRefresh?.()
                  } catch (error) {
                    toast.add({
                      type: 'error',
                      description: previewMessages.restoreFailed((error as Error).message),
                    })
                  }
                }}
              >
                {rollbackPending ? previewMessages.restoring : previewMessages.restore}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
