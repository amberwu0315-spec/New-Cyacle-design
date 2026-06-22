import * as React from 'react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { Button } from '#/components/ui/button.tsx'

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
  const handleDownload = React.useCallback(() => {
    if (!item) {
      return
    }

    onDownload?.(item)
  }, [item, onDownload])

  const canInlinePreview =
    item?.url && ['image', 'pdf', 'video'].includes(item.viewerFile.viewerKind)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(720px,calc(100vh-48px))] max-w-[min(960px,calc(100vw-32px))] grid-rows-[auto_1fr] p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="truncate pr-8">
            {item?.name || '附件预览'}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 overflow-hidden p-4">
          {item && canInlinePreview ? (
            item.viewerFile.viewerKind === 'image' ? (
              <img
                src={item.url}
                alt={item.name}
                className="h-full w-full object-contain"
              />
            ) : item.viewerFile.viewerKind === 'video' ? (
              <video
                src={item.url}
                controls
                className="h-full w-full bg-black object-contain"
              />
            ) : (
              <iframe
                src={item.url}
                title={item.name}
                className="h-full w-full rounded-md border"
              />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-sm text-muted-foreground">
              <p>当前附件暂不支持内嵌预览。</p>
              {item?.url || item?.rawUrl ? (
                <Button type="button" onClick={handleDownload}>
                  下载附件
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
