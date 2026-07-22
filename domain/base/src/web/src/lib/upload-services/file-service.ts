import { vrpcHttpClient } from '#/lib/vrpc-client.ts'
import { getWebProjectConfig } from '#/lib/web-project-config.ts'

export interface UploadedFileResource {
  id: string
  name?: string
  path?: string
  imageThumbPath?: string
}

export const AVATAR_ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

const MAX_AVATAR_FILE_BYTES = 10 * 1024 * 1024

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

function extractUploadedResource(payload: unknown): UploadedFileResource | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined
  }

  const payloadRecord = payload as Record<string, unknown>
  const payloadData =
    payloadRecord.data && typeof payloadRecord.data === 'object'
      ? (payloadRecord.data as Record<string, unknown>)
      : payloadRecord
  const id = payloadData.id

  if (typeof id !== 'string' || !id.trim()) {
    return undefined
  }

  return {
    id,
    name: typeof payloadData.name === 'string' ? payloadData.name : undefined,
    path: typeof payloadData.path === 'string' ? payloadData.path : undefined,
    imageThumbPath:
      typeof payloadData.imageThumbPath === 'string'
        ? payloadData.imageThumbPath
        : undefined,
  }
}

export function validateAvatarImageFile(
  file: File,
  messages: { invalidType: string; tooLarge: string },
) {
  if (
    !AVATAR_ACCEPTED_IMAGE_TYPES.includes(
      file.type as (typeof AVATAR_ACCEPTED_IMAGE_TYPES)[number],
    )
  ) {
    return messages.invalidType
  }

  if (file.size > MAX_AVATAR_FILE_BYTES) {
    return messages.tooLarge
  }

  return null
}

export function getFilePublicDownloadUrl(recordId?: string | null) {
  const trimmedRecordId = recordId?.trim()

  if (!trimmedRecordId) {
    return undefined
  }

  const params = new URLSearchParams({
    recordId: trimmedRecordId,
    image: 'thumb:medium',
  })

  return `${getWebProjectConfig().uploadServices.file.publicDownloadPath}?${params.toString()}`
}

export function getFileDownloadUrl(recordId?: string | null) {
  const trimmedRecordId = recordId?.trim()

  if (!trimmedRecordId) {
    return undefined
  }

  const params = new URLSearchParams({
    recordId: trimmedRecordId,
  })

  return `${getWebProjectConfig().uploadServices.file.privateDownloadPath}?${params.toString()}`
}

async function uploadFile(
  path: string,
  file: File,
  fallbackErrorMessage: string,
): Promise<UploadedFileResource> {
  const formData = new FormData()
  formData.append('file', file)

  const payload = await vrpcHttpClient.request<unknown>({
    path,
    method: 'POST',
    body: formData,
    options: {
      suppressGlobalToast: true,
      requestInit: {
        cache: 'no-cache',
      },
    },
  })

  const uploadedResource = extractUploadedResource(payload)

  if (!uploadedResource?.id) {
    throw new Error(normalizeServiceErrorMessage(payload, fallbackErrorMessage))
  }

  return uploadedResource
}

export function uploadPublicFile(
  file: File,
  fallbackErrorMessage: string,
): Promise<UploadedFileResource> {
  return uploadFile(
    getWebProjectConfig().uploadServices.file.publicUploadPath,
    file,
    fallbackErrorMessage,
  )
}

export function uploadPrivateFile(
  file: File,
  fallbackErrorMessage: string,
): Promise<UploadedFileResource> {
  return uploadFile(
    getWebProjectConfig().uploadServices.file.privateUploadPath,
    file,
    fallbackErrorMessage,
  )
}
