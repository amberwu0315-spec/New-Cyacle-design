import * as React from 'react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { Button } from '#/components/ui/button.tsx'
import { toast } from '#/components/ui/toast.tsx'
import { useAuthorizedMediaUrl } from '#/hooks/use-authorized-media-url.ts'
import { getMessages, languageStore } from '#/lib/i18n/index.ts'
import { downloadDocumentFileByUrl } from '#/lib/upload-services/core/document-service.ts'
import { useOptionalI18n } from './i18n/index.ts'

export type DocumentsPreviewSource = 'document' | 'file'

export interface DocumentsPreviewVersion {
  createdAt?: string | null
  creator?: { name?: string | null }
  comments?: string | null
  name?: string | null
  rawVersion?: string | null
  size?: number | string | null
  version?: string | null
}

export interface DocumentsPreviewItem {
  id: string
  name: string
  rawUrl?: string
  size?: number | null
  source: DocumentsPreviewSource
  url?: string
  version?: string | null
  viewerFile: {
    fileKind:
      | 'excel'
      | 'folder'
      | 'image'
      | 'keynote'
      | 'pdf'
      | 'ppt'
      | 'txt'
      | 'unknown'
      | 'video'
      | 'word'
      | 'zip'
    id: string
    name: string
    size?: number
    url?: string
    viewerKind: 'excel' | 'image' | 'pdf' | 'unsupported' | 'video'
  }
}

export interface DocumentPreviewDialogProps {
  item: DocumentsPreviewItem | null
  onDownload?: (item: DocumentsPreviewItem, useRawVersion?: boolean) => void
  onOpenChange: (open: boolean) => void
  onVersionRestored?: () => void
  open: boolean
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v'])
const EXCEL_EXTENSIONS = new Set(['csv', 'xls', 'xlsx'])
const PDF_EXTENSIONS = new Set(['pdf'])

function getFileExtension(name: string) {
  const extension = name.trim().split('.').pop()?.toLowerCase()

  return extension && extension !== name ? extension : ''
}

function resolveFileKind(name: string): DocumentsPreviewItem['viewerFile']['fileKind'] {
  const extension = getFileExtension(name)

  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image'
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return 'video'
  }

  if (EXCEL_EXTENSIONS.has(extension)) {
    return 'excel'
  }

  if (PDF_EXTENSIONS.has(extension)) {
    return 'pdf'
  }

  if (['doc', 'docx', 'rtf'].includes(extension)) {
    return 'word'
  }

  if (['ppt', 'pptx', 'key'].includes(extension)) {
    return extension === 'key' ? 'keynote' : 'ppt'
  }

  if (extension === 'txt') {
    return 'txt'
  }

  if (extension === 'zip') {
    return 'zip'
  }

  return 'unknown'
}

function resolveViewerKind(
  name: string,
): DocumentsPreviewItem['viewerFile']['viewerKind'] {
  const extension = getFileExtension(name)

  if (PDF_EXTENSIONS.has(extension)) {
    return 'pdf'
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image'
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return 'video'
  }

  if (EXCEL_EXTENSIONS.has(extension)) {
    return 'excel'
  }

  return 'unsupported'
}

function createPreviewItem(input: {
  id: string
  name: string
  size?: number | null
  source: DocumentsPreviewSource
  url?: string
  version?: string | null
}): DocumentsPreviewItem {
  const size = input.size ?? undefined

  return {
    id: input.id,
    name: input.name,
    rawUrl: input.url,
    size: input.size,
    source: input.source,
    url: input.url,
    version: input.version,
    viewerFile: {
      fileKind: resolveFileKind(input.name),
      id: input.id,
      name: input.name,
      size,
      url: input.url,
      viewerKind: resolveViewerKind(input.name),
    },
  }
}

export function createDocumentPreviewItemFromDocument(input: {
  createdAt?: string | null
  id: string
  name: string
  size?: number | null
  updatedAt?: string | null
  url?: string
  version?: string | null
}) {
  return createPreviewItem({
    id: input.id,
    name: input.name,
    size: input.size,
    source: 'document',
    url: input.url,
    version: input.version,
  })
}

export function createDocumentPreviewItem(input: {
  createdAt?: string | null
  id: string
  name: string
  raw?: { version?: string | null }
  size?: number | null
  updatedAt?: string | null
  url?: string
}) {
  return createDocumentPreviewItemFromDocument({
    ...input,
    version: input.raw?.version,
  })
}

export function createDocumentPreviewItemFromVersion(
  item: DocumentsPreviewItem,
  version: DocumentsPreviewVersion,
) {
  return createDocumentPreviewItemFromDocument({
    id: item.id,
    name: version.name || item.name,
    size: version.size == null ? item.size : Number(version.size),
    url: item.url,
    version: version.version,
  })
}

export function createFilePreviewItem(input: {
  id: string
  name: string
  size?: number | null
  url?: string
}) {
  return createPreviewItem({
    id: input.id,
    name: input.name,
    size: input.size,
    source: 'file',
    url: input.url,
  })
}

export function DocumentPreviewDialog({
  item,
  onDownload,
  onOpenChange,
  open,
}: DocumentPreviewDialogProps) {
  const { messages } = useOptionalI18n()
  const previewMessages = messages.assistantWorkbench.documentPreview
  const inlinePreviewable = ['image', 'pdf', 'video'].includes(
    item?.viewerFile.viewerKind ?? 'unknown',
  )
  // 只有内嵌预览才需要取 Blob：zip/word 等直接走下载，别白白拉一遍整份文件。
  const media = useAuthorizedMediaUrl(
    open && inlinePreviewable ? item?.url : undefined,
  )
  const handleDownload = React.useCallback(() => {
    if (!item) {
      return
    }

    if (onDownload) {
      onDownload(item)
      return
    }

    const url = item.url ?? item.rawUrl

    if (!url) {
      return
    }

    void downloadDocumentFileByUrl(url, item.name).catch((error: unknown) => {
      toast.add({
        type: 'error',
        description:
          error instanceof Error && error.message.trim()
            ? error.message
            : getMessages(languageStore.getSnapshot()).common.upload
                .documentDownloadFailed,
      })
    })
  }, [item, onDownload])

  const canInlinePreview =
    inlinePreviewable && Boolean(media.url) && !media.failed

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(720px,calc(100vh-48px))] max-w-[min(960px,calc(100vw-32px))] grid-rows-[auto_1fr] p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="truncate pr-8">
            {item?.name || previewMessages.attachmentPreview}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 overflow-hidden p-4">
          {item && canInlinePreview ? (
            item.viewerFile.viewerKind === 'image' ? (
              <img
                src={media.url ?? undefined}
                alt={item.name}
                className="h-full w-full object-contain"
              />
            ) : item.viewerFile.viewerKind === 'video' ? (
              <video
                src={media.url ?? undefined}
                controls
                className="h-full w-full bg-black object-contain"
              />
            ) : (
              <iframe
                src={media.url ?? undefined}
                title={item.name}
                className="h-full w-full rounded-md border"
              />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-sm text-muted-foreground">
              <p>{previewMessages.unsupportedAttachmentPreview}</p>
              {item?.url || item?.rawUrl ? (
                <Button type="button" onClick={handleDownload}>
                  {previewMessages.downloadAttachment}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
