import type { ViewerFile, ViewerKind } from '@cew-lib/file-viewer-base'
import { getFileExtension, resolveFileKind } from '@cew-lib/file-viewer-base'

import {
  getDocumentDownloadUrl,
  getDocumentPreviewImageUrl,
} from '#/lib/upload-services/core/document-service.ts'
import { getMessages, languageStore } from '#/lib/i18n/index.ts'
import { getFileDownloadUrl } from '#/lib/upload-services/core/file-service.ts'

import {
  formatDocumentDate,
  formatDocumentFileSize,
} from './document-preview-utils'

export type DocumentsPreviewSource = 'document' | 'file'

export interface DocumentsPreviewItem {
  id: string
  name: string
  source: DocumentsPreviewSource
  version?: string | null
  size?: number | null
  url?: string
  rawUrl?: string
  /** 预览项所属目标（组织/核算等由调用方决定），供业务扩展按同一目标读写数据。 */
  targetId?: string | null
  /** 文档的资源内容类型，供业务扩展推导默认值（如数据记录来源类型）。 */
  resourceContentType?: string | null
  viewerFile: ViewerFile
}

export interface DocumentsPreviewDocumentEntry {
  createdAt?: string | null
  id: string
  name: string
  raw?: {
    version?: string | null
  } | null
  size?: number | null
  updatedAt?: string | null
}

export interface DocumentsPreviewVersion {
  comments?: string | null
  createdAt?: string | null
  creator?: {
    name?: string | null
  } | null
  name?: string | null
  rawVersion?: string | null
  size?: number | string | null
  version: string
}

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'webp',
  'tif',
  'tiff',
  'svg',
])
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v'])
const EXCEL_EXTENSIONS = new Set(['csv', 'xls', 'xlsx'])
const PDF_EXTENSIONS = new Set(['pdf'])
const PDF_CONVERTIBLE_EXTENSIONS = new Set([
  'doc',
  'docx',
  'ppt',
  'pptx',
  'txt',
  'key',
  'pages',
  'rtf',
  'html',
])

function withPreviewGenerate(url?: string) {
  if (!url) {
    return undefined
  }

  return `${url}${url.includes('?') ? '&' : '?'}preview=generate`
}

function resolvePreviewKind(name: string, source: DocumentsPreviewSource) {
  const extension = getFileExtension(name)
  const fileKind = resolveFileKind(name)

  if (PDF_EXTENSIONS.has(extension)) {
    return { viewerKind: 'pdf' as ViewerKind, fileKind }
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return { viewerKind: 'image' as ViewerKind, fileKind }
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return { viewerKind: 'video' as ViewerKind, fileKind }
  }

  if (EXCEL_EXTENSIONS.has(extension)) {
    return { viewerKind: 'excel' as ViewerKind, fileKind }
  }

  if (PDF_CONVERTIBLE_EXTENSIONS.has(extension)) {
    return { viewerKind: 'pdf' as ViewerKind, fileKind }
  }

  if (source === 'document') {
    return { viewerKind: 'unsupported' as ViewerKind, fileKind }
  }

  return { viewerKind: 'unsupported' as ViewerKind, fileKind }
}

function shouldUseGeneratedPreview(name: string) {
  const extension = getFileExtension(name)

  return PDF_CONVERTIBLE_EXTENSIONS.has(extension)
}

function getDocumentPreviewMessages() {
  return getMessages(languageStore.getSnapshot()).common.documentPreview
}

export function createDocumentPreviewItem(
  entry: DocumentsPreviewDocumentEntry,
  options: { resourceContentType?: string | null; targetId?: string | null } = {},
): DocumentsPreviewItem {
  return createDocumentPreviewItemFromDocument({
    createdAt: entry.createdAt,
    id: entry.id,
    name: entry.name,
    resourceContentType: options.resourceContentType,
    size: entry.size,
    targetId: options.targetId,
    updatedAt: entry.updatedAt,
    version: entry.raw?.version,
  })
}

export function createDocumentPreviewItemFromDocument(input: {
  createdAt?: string | null
  id: string
  name: string
  resourceContentType?: string | null
  size?: number | null
  targetId?: string | null
  updatedAt?: string | null
  version?: string | null
}): DocumentsPreviewItem {
  const source: DocumentsPreviewSource = 'document'
  const { viewerKind, fileKind } = resolvePreviewKind(input.name, source)
  const url = getDocumentPreviewImageUrl(input.id, {
    preview: shouldUseGeneratedPreview(input.name),
    version: input.version,
  })
  const rawUrl = getDocumentDownloadUrl(input.id, {
    useRawVersion: true,
  })
  const size = input.size ?? undefined
  const messages = getDocumentPreviewMessages()

  return {
    id: input.id,
    name: input.name,
    source,
    version: input.version,
    resourceContentType: input.resourceContentType ?? null,
    size: input.size,
    targetId: input.targetId ?? null,
    url,
    rawUrl,
    viewerFile: {
      id: input.id,
      name: input.name,
      url,
      viewerKind,
      fileKind,
      size,
      infoPanel: {
        documentInfo: {
          title: messages.info.documentTitle,
          items: [
            { label: messages.info.source, value: messages.info.documentSource },
            { label: messages.info.version, value: input.version || '-' },
            {
              label: messages.info.size,
              value: formatDocumentFileSize(input.size ?? null),
            },
            {
              label: messages.info.createdAt,
              value: formatDocumentDate(input.createdAt ?? null),
            },
            {
              label: messages.info.updatedAt,
              value: formatDocumentDate(input.updatedAt ?? null),
            },
          ],
        },
      },
    },
  }
}

export function createDocumentPreviewItemFromVersion(
  item: DocumentsPreviewItem,
  version: DocumentsPreviewVersion,
): DocumentsPreviewItem {
  return createDocumentPreviewItemFromDocument({
    createdAt: version.createdAt,
    id: item.id,
    name: version.name || item.name,
    size: Number(version.size),
    updatedAt: version.createdAt,
    version: version.version,
  })
}

export function createFilePreviewItem(input: {
  id: string
  name: string
  size?: number | null
  targetId?: string | null
  url?: string
}): DocumentsPreviewItem {
  const source: DocumentsPreviewSource = 'file'
  const { viewerKind, fileKind } = resolvePreviewKind(input.name, source)
  const directUrl = input.url ?? getFileDownloadUrl(input.id)
  const url = shouldUseGeneratedPreview(input.name)
    ? withPreviewGenerate(directUrl)
    : directUrl
  const size = input.size ?? undefined
  const messages = getDocumentPreviewMessages()

  return {
    id: input.id,
    name: input.name,
    source,
    size: input.size,
    targetId: input.targetId ?? null,
    url,
    rawUrl: directUrl,
    viewerFile: {
      id: input.id,
      name: input.name,
      url,
      viewerKind,
      fileKind,
      size,
      infoPanel: {
        documentInfo: {
          title: messages.info.fileTitle,
          items: [
            { label: messages.info.source, value: messages.info.fileSource },
            {
              label: messages.info.size,
              value: formatDocumentFileSize(input.size ?? null),
            },
          ],
        },
      },
    },
  }
}
