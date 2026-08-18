import * as React from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import { UnsupportedContent } from '@cew-lib/file-viewer-base'
import type { ViewerContentProps } from '@cew-lib/file-viewer-base'

import { Button } from '#/components/ui/button.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'
import { cn } from '#/lib/utils.ts'
import { fetchDocumentBlobByUrl } from '#/lib/upload-services/core/document-service.ts'
import { getMessages, languageStore, useTranslation } from '#/lib/i18n/index.ts'

import type { DocumentsPreviewItem } from './documents-preview'

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

interface AuthorizedInlinePreviewState {
  error: string | null
  loading: boolean
  objectUrl: string | null
}

const AUTHORIZED_INLINE_PREVIEW_IDLE_STATE: AuthorizedInlinePreviewState = {
  error: null,
  loading: false,
  objectUrl: null,
}

export interface InlineDocumentPreviewProps {
  className?: string
  download?: ViewerContentProps['download']
  emptyDescription?: string
  emptyTitle?: string
  item: DocumentsPreviewItem | null
  toolbar?: ViewerContentProps['toolbar']
  viewerClassName?: string
}

function InlineDocumentPreviewContent(props: ViewerContentProps) {
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

function useAuthorizedInlinePreviewItem(
  item: DocumentsPreviewItem | null,
  reloadToken: number,
) {
  const [state, setState] = React.useState<AuthorizedInlinePreviewState>(
    AUTHORIZED_INLINE_PREVIEW_IDLE_STATE,
  )
  const authorizedPreviewUrl = shouldFetchAuthorizedPreviewUrl(item)
    ? item?.url
    : undefined

  React.useEffect(() => {
    if (!authorizedPreviewUrl) {
      setState(AUTHORIZED_INLINE_PREVIEW_IDLE_STATE)
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
  }, [authorizedPreviewUrl, reloadToken])

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

function InlinePreviewState({
  action,
  description,
  loading,
  title,
}: {
  action?: React.ReactNode
  description: string
  loading?: boolean
  title: string
}) {
  return (
    <div className="flex h-full min-h-[420px] w-full min-w-0 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
      {loading ? <Spinner className="size-5" /> : <FileText className="size-8" />}
      <div className="font-medium text-foreground">{title}</div>
      <div className="max-w-md leading-relaxed">{description}</div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}

export function InlineDocumentPreview({
  className,
  download,
  emptyDescription,
  emptyTitle,
  item,
  toolbar,
  viewerClassName,
}: InlineDocumentPreviewProps) {
  const { t: messages } = useTranslation()
  const previewMessages = messages.common.documentPreview
  const [reloadToken, setReloadToken] = React.useState(0)
  const authorizedPreview = useAuthorizedInlinePreviewItem(item, reloadToken)
  const resolvedEmptyDescription =
    emptyDescription ?? previewMessages.emptyDescription
  const resolvedEmptyTitle = emptyTitle ?? previewMessages.emptyTitle
  const handleRetry = React.useCallback(() => {
    setReloadToken((current) => current + 1)
  }, [])

  if (!item) {
    return (
      <div
        className={cn(
          'flex h-full min-h-[420px] w-full min-w-0 flex-1 overflow-hidden rounded-lg border bg-card',
          className,
        )}
      >
        <InlinePreviewState
          description={resolvedEmptyDescription}
          title={resolvedEmptyTitle}
        />
      </div>
    )
  }

  if (authorizedPreview.loading) {
    return (
      <div
        className={cn(
          'flex h-full min-h-[420px] w-full min-w-0 flex-1 overflow-hidden rounded-lg border bg-card',
          className,
        )}
      >
        <InlinePreviewState
          description={previewMessages.loadingDocument}
          loading
          title={previewMessages.loadingDocument}
        />
      </div>
    )
  }

  if (authorizedPreview.error) {
    return (
      <div
        className={cn(
          'flex h-full min-h-[420px] w-full min-w-0 flex-1 overflow-hidden rounded-lg border bg-card',
          className,
        )}
      >
        <InlinePreviewState
          action={
            <Button type="button" variant="outline" onClick={handleRetry}>
              <RefreshCw className="size-4" />
              {previewMessages.retry}
            </Button>
          }
          description={authorizedPreview.error}
          title={previewMessages.loadFailedTitle}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-[420px] w-full min-w-0 flex-1 overflow-hidden rounded-lg border bg-card',
        className,
      )}
    >
      <React.Suspense
        fallback={
          <div className="flex h-full w-full min-w-0 flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            {previewMessages.loadingViewer}
          </div>
        }
      >
        <InlineDocumentPreviewContent
          file={authorizedPreview.item?.viewerFile ?? null}
          className="h-full w-full min-w-0 flex-1"
          download={download}
          toolbar={toolbar}
          classNames={{
            root: cn(
              'documents-preview-viewer h-full w-full min-w-0 rounded-none !border-0',
              viewerClassName,
            ),
          }}
        />
      </React.Suspense>
    </div>
  )
}
