import * as React from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import { UnsupportedContent } from '@cew-lib/file-viewer-base'
import type { ViewerContentProps } from '@cew-lib/file-viewer-base'

import { Button } from '#/components/ui/button.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'
import { cn } from '#/lib/utils.ts'
import { fetchDocumentBlobByUrl } from '#/lib/upload-services/core/document-service.ts'

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
  emptyDescription?: string
  emptyTitle?: string
  item: DocumentsPreviewItem | null
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

  return '文档预览加载失败，请稍后重试。'
}

function createObjectUrl(blob: Blob) {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('当前环境不支持文档预览。')
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
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
      {loading ? <Spinner className="size-5" /> : <FileText className="size-8" />}
      <div className="font-medium text-foreground">{title}</div>
      <div className="max-w-md leading-relaxed">{description}</div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}

export function InlineDocumentPreview({
  className,
  emptyDescription = '当前文件还没有可用的预览内容。',
  emptyTitle = '暂无文件预览',
  item,
  viewerClassName,
}: InlineDocumentPreviewProps) {
  const [reloadToken, setReloadToken] = React.useState(0)
  const authorizedPreview = useAuthorizedInlinePreviewItem(item, reloadToken)
  const handleRetry = React.useCallback(() => {
    setReloadToken((current) => current + 1)
  }, [])

  if (!item) {
    return (
      <div
        className={cn(
          'flex h-full min-h-[420px] min-w-0 flex-1 overflow-hidden rounded-lg border bg-card',
          className,
        )}
      >
        <InlinePreviewState
          description={emptyDescription}
          title={emptyTitle}
        />
      </div>
    )
  }

  if (authorizedPreview.loading) {
    return (
      <div
        className={cn(
          'flex h-full min-h-[420px] min-w-0 flex-1 overflow-hidden rounded-lg border bg-card',
          className,
        )}
      >
        <InlinePreviewState
          description="正在读取文件内容并加载预览器。"
          loading
          title="文件预览加载中"
        />
      </div>
    )
  }

  if (authorizedPreview.error) {
    return (
      <div
        className={cn(
          'flex h-full min-h-[420px] min-w-0 flex-1 overflow-hidden rounded-lg border bg-card',
          className,
        )}
      >
        <InlinePreviewState
          action={
            <Button type="button" variant="outline" onClick={handleRetry}>
              <RefreshCw className="size-4" />
              重试
            </Button>
          }
          description={authorizedPreview.error}
          title="文件预览加载失败"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-[420px] min-w-0 flex-1 overflow-hidden rounded-lg border bg-card',
        className,
      )}
    >
      <React.Suspense
        fallback={
          <div className="flex h-full flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            正在加载预览器...
          </div>
        }
      >
        <InlineDocumentPreviewContent
          file={authorizedPreview.item?.viewerFile ?? null}
          className="h-full flex-1"
          classNames={{
            root: cn(
              'documents-preview-viewer h-full rounded-none border-0',
              viewerClassName,
            ),
          }}
        />
      </React.Suspense>
    </div>
  )
}
