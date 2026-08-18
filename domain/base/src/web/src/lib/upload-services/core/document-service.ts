import {
  resolveServiceUrl,
  uploadFileWithFormDataByXhr,
  uploadFileWithFormData,
} from './upload-service.shared'
import { getWebProjectConfig } from '#/lib/web-project-config.ts'
import { getSessionAuthorizationHeader } from '#/lib/session-storage.ts'
import { getMessages, languageStore } from '#/lib/i18n/index.ts'

export const DOCUMENT_SERVICE_PATH_PREFIX = '/uic.DocumentWeb/DocumentService'

function getDocumentUploadPath() {
  return getWebProjectConfig().uploadServices.document.uploadPath
}

function getDocumentDownloadPath() {
  return getWebProjectConfig().uploadServices.document.downloadPath
}

function getUploadMessages() {
  return getMessages(languageStore.getSnapshot()).common.upload
}

export interface DocumentDownloadUrlOptions {
  host?: string
  useRawVersion?: boolean
}

export function getDocumentDownloadUrl(
  docId?: string | null,
  hostOrOptions?: string | DocumentDownloadUrlOptions,
) {
  if (!docId) {
    return undefined
  }

  const options =
    typeof hostOrOptions === 'string' ? { host: hostOrOptions } : hostOrOptions
  const params = new URLSearchParams({ id: docId })
  const url = `${resolveServiceUrl(getDocumentDownloadPath(), options?.host)}?${params.toString()}`

  return options?.useRawVersion ? `${url}&useRawVersion=true` : url
}

export interface DocumentPreviewImageUrlOptions {
  thumb?: 'small' | 'medium' | 'large'
  preview?: boolean
  version?: string | null
  host?: string
}

export interface FetchDocumentBlobByUrlOptions {
  signal?: AbortSignal
}

function buildDocumentDownloadHeaders() {
  const headers = new Headers()
  const authorization = getSessionAuthorizationHeader()

  if (authorization) {
    headers.set('Authorization', authorization)
  }

  return headers
}

async function readResponseErrorMessage(response: Response) {
  const bodyText = await response.text().catch(() => '')

  if (!bodyText) {
    return null
  }

  try {
    const payload = JSON.parse(bodyText) as unknown

    if (
      payload &&
      typeof payload === 'object' &&
      'message' in payload &&
      typeof payload.message === 'string' &&
      payload.message.trim()
    ) {
      return payload.message
    }
  } catch {
    return bodyText
  }

  return bodyText
}

export async function fetchDocumentBlobByUrl(
  url?: string | null,
  options: FetchDocumentBlobByUrlOptions = {},
) {
  if (!url) {
    throw new Error(getUploadMessages().documentPreviewUrlRequired)
  }

  const response = await fetch(url, {
    cache: 'no-cache',
    credentials: 'include',
    headers: buildDocumentDownloadHeaders(),
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(
      (await readResponseErrorMessage(response)) ||
        getUploadMessages().documentLoadFailed,
    )
  }

  const blob = await response.blob()

  if (!blob.size) {
    throw new Error(getUploadMessages().documentContentEmpty)
  }

  return blob
}

export function getDocumentPreviewImageUrl(
  docId?: string | null,
  options: DocumentPreviewImageUrlOptions = {},
) {
  const baseUrl = getDocumentDownloadUrl(docId, { host: options.host })

  if (!baseUrl) {
    return undefined
  }

  const params = new URLSearchParams()

  if (options.preview) {
    params.set('preview', 'generate')
  }

  if (options.thumb) {
    params.set('image', `thumb:${options.thumb}`)
  }

  if (options.version) {
    params.set('version', options.version)
  }

  const suffix = params.toString()

  return suffix ? `${baseUrl}&${suffix}` : baseUrl
}

export interface UploadDocumentInput {
  file: File
  organizationId: string
  folderId?: string | null
  folderDesc?: string | null
}

function buildDocumentUploadFormData({
  file,
  organizationId,
  folderId,
  folderDesc,
}: UploadDocumentInput) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('organizationId', organizationId)
  formData.append('folderId', folderId ?? '')
  formData.append('folderDesc', folderDesc ?? '')

  return formData
}

export async function uploadDocumentFile(
  { file, organizationId, folderId, folderDesc }: UploadDocumentInput,
  host?: string,
) {
  return uploadFileWithFormData(
    getDocumentUploadPath(),
    buildDocumentUploadFormData({
      file,
      organizationId,
      folderId,
      folderDesc,
    }),
    getUploadMessages().documentUploadFailed,
    host,
  )
}

export function uploadDocumentFileWithProgress(
  input: UploadDocumentInput,
  options: {
    host?: string
    onProgress?: (progress: number, loaded: number, total: number) => void
  } = {},
) {
  return uploadFileWithFormDataByXhr(
    getDocumentUploadPath(),
    buildDocumentUploadFormData(input),
    getUploadMessages().documentUploadFailed,
    options,
  )
}
