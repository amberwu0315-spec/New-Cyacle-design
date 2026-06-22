import type { ViewerFile, ViewerKind } from '@cew-lib/file-viewer-base'
import { getFileExtension, resolveFileKind } from '@cew-lib/file-viewer-base'

import {
  getDocumentDownloadUrl,
  getDocumentPreviewImageUrl,
} from '#/lib/upload-services/core/document-service.ts'
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

export function createDocumentPreviewItem(
  entry: DocumentsPreviewDocumentEntry,
): DocumentsPreviewItem {
  return createDocumentPreviewItemFromDocument({
    createdAt: entry.createdAt,
    id: entry.id,
    name: entry.name,
    size: entry.size,
    updatedAt: entry.updatedAt,
    version: entry.raw?.version,
  })
}

export function createDocumentPreviewItemFromDocument(input: {
  createdAt?: string | null
  id: string
  name: string
  size?: number | null
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

  return {
    id: input.id,
    name: input.name,
    source,
    version: input.version,
    size: input.size,
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
          title: '文档信息',
          items: [
            { label: '来源', value: '文档管理' },
            { label: '版本', value: input.version || '-' },
            {
              label: '大小',
              value: formatDocumentFileSize(input.size ?? null),
            },
            {
              label: '创建时间',
              value: formatDocumentDate(input.createdAt ?? null),
            },
            {
              label: '更新时间',
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
  url?: string
}): DocumentsPreviewItem {
  const source: DocumentsPreviewSource = 'file'
  const { viewerKind, fileKind } = resolvePreviewKind(input.name, source)
  const directUrl = input.url ?? getFileDownloadUrl(input.id)
  const url = shouldUseGeneratedPreview(input.name)
    ? withPreviewGenerate(directUrl)
    : directUrl
  const size = input.size ?? undefined

  return {
    id: input.id,
    name: input.name,
    source,
    size: input.size,
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
          title: '文件信息',
          items: [
            { label: '来源', value: '文件服务' },
            {
              label: '大小',
              value: formatDocumentFileSize(input.size ?? null),
            },
          ],
        },
      },
    },
  }
}
