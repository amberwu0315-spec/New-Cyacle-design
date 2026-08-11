import { getSessionAuthorizationHeader } from '#/lib/session-storage.ts'

import { UploadAbortError } from './upload-pool'

export interface UploadedFileResource {
  id: string
  documentId?: string
  name?: string
  url?: string
}

function normalizeServicePath(path: string): string {
  const trimmedPath = path.trim()

  if (!trimmedPath) {
    throw new Error('Service path is required.')
  }

  return trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`
}

function normalizeServiceErrorMessage(
  payload: unknown,
  fallback: string,
): string {
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

function extractUploadedResource(
  payload: unknown,
): UploadedFileResource | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined
  }

  const payloadRecord = payload as Record<string, unknown>
  const payloadData =
    payloadRecord.data && typeof payloadRecord.data === 'object'
      ? (payloadRecord.data as Record<string, unknown>)
      : payloadRecord
  const documentId = payloadData.documentId
  const id =
    typeof documentId === 'string' && documentId.trim()
      ? documentId
      : payloadData.id

  if (typeof id !== 'string' || !id.trim()) {
    return undefined
  }

  return {
    id,
    documentId: typeof documentId === 'string' ? documentId : undefined,
    name: typeof payloadData.name === 'string' ? payloadData.name : undefined,
    url: typeof payloadData.url === 'string' ? payloadData.url : undefined,
  }
}

export function resolveServiceUrl(path: string, host?: string) {
  if (host?.trim()) {
    return `${host.replace(/\/+$/, '')}${normalizeServicePath(path)}`
  }

  return normalizeServicePath(path)
}

function attachAuthorization(headers: Headers) {
  const authorization = getSessionAuthorizationHeader()

  if (authorization) {
    headers.set('Authorization', authorization)
  }
}

export async function uploadFileWithFormData(
  path: string,
  formData: FormData,
  fallbackErrorMessage: string,
  host?: string,
): Promise<UploadedFileResource> {
  const headers = new Headers()
  attachAuthorization(headers)

  const response = await fetch(resolveServiceUrl(path, host), {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
    cache: 'no-cache',
  })

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    payload = undefined
  }

  const uploadedResource = extractUploadedResource(payload)

  if (!response.ok || !uploadedResource?.id) {
    throw new Error(normalizeServiceErrorMessage(payload, fallbackErrorMessage))
  }

  return uploadedResource
}

export function uploadFileWithFormDataByXhr(
  path: string,
  formData: FormData,
  fallbackErrorMessage: string,
  options: {
    host?: string
    onProgress?: (progress: number, loaded: number, total: number) => void
  } = {},
) {
  const xhr = new XMLHttpRequest()

  const promise = new Promise<UploadedFileResource>((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return
      }

      const progress = Math.round((event.loaded / event.total) * 100)

      options.onProgress?.(progress, event.loaded, event.total)
    }

    xhr.onload = () => {
      let payload: unknown

      try {
        payload = JSON.parse(xhr.responseText)
      } catch {
        payload = undefined
      }

      const uploadedResource = extractUploadedResource(payload)

      if (xhr.status >= 200 && xhr.status < 300 && uploadedResource?.id) {
        resolve(uploadedResource)
        return
      }

      reject(
        new Error(normalizeServiceErrorMessage(payload, fallbackErrorMessage)),
      )
    }

    xhr.onerror = () => {
      reject(new Error(fallbackErrorMessage))
    }

    xhr.onabort = () => {
      reject(new UploadAbortError())
    }

    xhr.open('POST', resolveServiceUrl(path, options.host), true)
    xhr.withCredentials = true
    xhr.setRequestHeader('Accept', 'application/json')
    const authorization = getSessionAuthorizationHeader()
    if (authorization) {
      xhr.setRequestHeader('Authorization', authorization)
    }
    xhr.send(formData)
  })

  return {
    xhr,
    abort: () => xhr.abort(),
    promise,
  }
}
