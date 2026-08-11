import { getVrpcHttpClient } from '#/lib/vrpc-client.ts'
import { getWebProjectConfig } from '#/lib/web-project-config.ts'
import { getSessionAuthorizationHeader } from '#/lib/session-storage.ts'
import { getMessages, languageStore } from '#/lib/i18n/index.ts'

export interface UploadedDocumentResource {
  id: string
  name?: string
  url?: string
}

export interface UploadDocumentInput {
  file: File
  organizationId: string
  folderId?: string | null
  fileDesc?: string | null
}

export interface FetchDocumentDownloadBlobOptions {
  signal?: AbortSignal
}

function extractUploadedDocument(payload: unknown): UploadedDocumentResource | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const payloadRecord = payload as Record<string, unknown>
  const payloadData =
    payloadRecord.data && typeof payloadRecord.data === 'object'
      ? (payloadRecord.data as Record<string, unknown>)
      : payloadRecord
  const id = payloadData.id

  if (typeof id !== 'string' || !id.trim()) {
    return null
  }

  return {
    id,
    name: typeof payloadData.name === 'string' ? payloadData.name : undefined,
    url: typeof payloadData.url === 'string' ? payloadData.url : undefined,
  }
}

function normalizeServiceErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string' &&
    payload.message.trim()
  ) {
    return payload.message
  }

  if (payload instanceof Error && payload.message.trim()) {
    return payload.message
  }

  return fallback
}

function getUploadMessages() {
  return getMessages(languageStore.getSnapshot()).common.upload
}

export function getDocumentDownloadUrl(docId?: string | null) {
  const trimmedDocId = docId?.trim()

  if (!trimmedDocId) {
    return undefined
  }

  const params = new URLSearchParams({ id: trimmedDocId })

  return `${getWebProjectConfig().uploadServices.document.downloadPath}?${params.toString()}`
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

export async function fetchDocumentDownloadBlob(
  docId?: string | null,
  options: FetchDocumentDownloadBlobOptions = {},
) {
  const downloadUrl = getDocumentDownloadUrl(docId)

  if (!downloadUrl) {
    throw new Error(getUploadMessages().documentIdRequired)
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
        getUploadMessages().documentDownloadFailed,
    )
  }

  const blob = await response.blob()

  if (!blob.size) {
    throw new Error(getUploadMessages().documentContentEmpty)
  }

  return blob
}

export async function uploadDocumentFile({
  file,
  fileDesc,
  folderId,
  organizationId,
}: UploadDocumentInput): Promise<UploadedDocumentResource> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('organizationId', organizationId)
  formData.append('folderId', folderId ?? '')
  formData.append('fileDesc', fileDesc ?? '')

  const payload = await getVrpcHttpClient().request<unknown>({
    path: getWebProjectConfig().uploadServices.document.uploadPath,
    method: 'POST',
    body: formData,
    options: {
      suppressGlobalToast: true,
      requestInit: {
        cache: 'no-cache',
      },
    },
  })

  const uploadedDocument = extractUploadedDocument(payload)

  if (!uploadedDocument) {
    throw new Error(
      normalizeServiceErrorMessage(
        payload,
        getUploadMessages().documentUploadFailed,
      ),
    )
  }

  return uploadedDocument
}
