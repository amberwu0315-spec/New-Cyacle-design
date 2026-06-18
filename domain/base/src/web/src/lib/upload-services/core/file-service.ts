import {
  resolveServiceUrl,
  uploadFileWithFormDataByXhr,
  uploadFileWithFormData,
} from './upload-service.shared'
import { getWebProjectConfig } from '#/lib/web-project-config.ts'

export const FILE_SERVICE_PATH_PREFIX = '/file.FileWeb/FileService'

function getFilePublicUploadPath() {
  return getWebProjectConfig().uploadServices.file.publicUploadPath
}

function getFilePrivateUploadPath() {
  return getWebProjectConfig().uploadServices.file.privateUploadPath
}

function getFilePrivateDownloadPath() {
  return getWebProjectConfig().uploadServices.file.privateDownloadPath
}

export function getFileDownloadUrl(recordId?: string | null, host?: string) {
  if (!recordId) {
    return undefined
  }

  const params = new URLSearchParams({ recordId })

  return `${resolveServiceUrl(getFilePrivateDownloadPath(), host)}?${params.toString()}`
}

export async function uploadPublicFile(file: File, host?: string) {
  const formData = new FormData()
  formData.append('file', file)

  return uploadFileWithFormData(
    getFilePublicUploadPath(),
    formData,
    '文件上传失败，请稍后重试。',
    host,
  )
}

export async function uploadPrivateFile(file: File, host?: string) {
  const formData = new FormData()
  formData.append('file', file)

  return uploadFileWithFormData(
    getFilePrivateUploadPath(),
    formData,
    '文件上传失败，请稍后重试。',
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
    '文件上传失败，请稍后重试。',
    options,
  )
}
