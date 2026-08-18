import {
  resolveServiceUrl,
  uploadFileWithFormDataByXhr,
  uploadFileWithFormData,
} from './upload-service.shared'
import { getWebProjectConfig } from '#/lib/web-project-config.ts'
import { getSessionAuthorizationHeader } from '#/lib/session-storage.ts'
import { getMessages, languageStore } from '#/lib/i18n/index.ts'

export const FILE_SERVICE_PATH_PREFIX = '/file.FileWeb/FileService'

export interface FetchFileDownloadBlobOptions {
  signal?: AbortSignal
}

function getFilePublicUploadPath() {
  return getWebProjectConfig().uploadServices.file.publicUploadPath
}

function getFilePrivateUploadPath() {
  return getWebProjectConfig().uploadServices.file.privateUploadPath
}

function getFilePrivateDownloadPath() {
  return getWebProjectConfig().uploadServices.file.privateDownloadPath
}

function getUploadMessages() {
  return getMessages(languageStore.getSnapshot()).common.upload
}

export function getFileDownloadUrl(recordId?: string | null, host?: string) {
  if (!recordId) {
    return undefined
  }

  const params = new URLSearchParams({ recordId })

  return `${resolveServiceUrl(getFilePrivateDownloadPath(), host)}?${params.toString()}`
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

export async function fetchFileDownloadBlob(
  recordId?: string | null,
  options: FetchFileDownloadBlobOptions = {},
) {
  const downloadUrl = getFileDownloadUrl(recordId)

  if (!downloadUrl) {
    throw new Error(getUploadMessages().fileIdRequired)
  }

  const headers = new Headers()
  const authorization = getSessionAuthorizationHeader()

  if (authorization) {
    headers.set('Authorization', authorization)
  }

  const response = await fetch(downloadUrl, {
    cache: 'no-cache',
    credentials: 'include',
    headers,
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(
      (await readResponseErrorMessage(response)) ||
        getUploadMessages().fileDownloadFailed,
    )
  }

  const blob = await response.blob()

  if (!blob.size) {
    throw new Error(getUploadMessages().fileContentEmpty)
  }

  return blob
}

export async function uploadPublicFile(file: File, host?: string) {
  const formData = new FormData()
  formData.append('file', file)

  return uploadFileWithFormData(
    getFilePublicUploadPath(),
    formData,
    getUploadMessages().fileUploadFailed,
    host,
  )
}

export async function uploadPrivateFile(file: File, host?: string) {
  const formData = new FormData()
  formData.append('file', file)

  return uploadFileWithFormData(
    getFilePrivateUploadPath(),
    formData,
    getUploadMessages().fileUploadFailed,
    host,
  )
}

export function uploadPrivateFileWithProgress(
  file: File,
  options: {
    host?: string
    onProgress?: (progress: number, loaded: number, total: number) => void
  } = {},
) {
  const formData = new FormData()

  formData.append('file', file)

  return uploadFileWithFormDataByXhr(
    getFilePrivateUploadPath(),
    formData,
    getUploadMessages().fileUploadFailed,
    options,
  )
}
