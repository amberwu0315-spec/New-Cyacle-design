import { formatFileSize } from '#/lib/formatters.ts'
import type { AppMessages } from '#/components/assistant-workbench/i18n/index.ts'

export const ASSISTANT_MAX_ATTACHMENTS = 5
export const ASSISTANT_MAX_FILE_SIZE = 20 * 1024 * 1024
const ASSISTANT_MAX_FILE_SIZE_MB = Math.floor(
  ASSISTANT_MAX_FILE_SIZE / 1024 / 1024,
)

type AssistantWorkbenchMessages = AppMessages['assistantWorkbench']

export interface AssistantDraftFileAttachment {
  id: string
  kind: 'file'
  file: File
  name: string
  noteText?: string
  size: number
  sizeText: string
  mimeType: string
  contentBase64?: string
  remoteFileId?: string
  uploadStatus?: 'uploading' | 'ready' | 'failed'
  errorMessage?: string
}

export type AssistantDraftAttachment = AssistantDraftFileAttachment

export interface AppendAssistantFilesResult {
  attachments: Array<AssistantDraftAttachment>
  addedCount: number
  rejectedMessages: Array<string>
}

function isImageAttachment(mimeType: string, fileName: string) {
  const normalizedMimeType = mimeType.toLowerCase()
  const normalizedFileName = fileName.toLowerCase()

  return (
    normalizedMimeType.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(normalizedFileName)
  )
}

function readFileAsBase64(
  file: File,
  messages?: AssistantWorkbenchMessages,
) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    const errorMessage =
      messages?.attachments.validation.imagePreviewReadFailed ??
      '图片预览读取失败。'

    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') {
        reject(new Error(errorMessage))
        return
      }

      const commaIndex = reader.result.indexOf(',')

      resolve(
        commaIndex >= 0 ? reader.result.slice(commaIndex + 1) : reader.result,
      )
    })

    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error(errorMessage))
    })

    reader.readAsDataURL(file)
  })
}

function buildDraftFileAttachmentId(
  file: Pick<File, 'name' | 'size' | 'lastModified'>,
) {
  return `file:${file.name}:${file.size}:${file.lastModified}`
}

function resolveFallbackFileExtension(mimeType: string) {
  const normalizedMimeType = mimeType.toLowerCase()

  if (!normalizedMimeType) {
    return ''
  }

  if (normalizedMimeType === 'image/jpeg') {
    return 'jpg'
  }

  if (normalizedMimeType === 'image/svg+xml') {
    return 'svg'
  }

  const mimeSubtype = normalizedMimeType.split('/')[1]?.trim()

  if (!mimeSubtype) {
    return ''
  }

  return mimeSubtype.split('+')[0] ?? ''
}

function resolveNextFallbackAttachmentIndex(args: {
  current: Array<AssistantDraftAttachment>
  baseName: string
}) {
  const pattern = new RegExp(`^${args.baseName}-(\\d+)(?:\\.[^.]+)?$`, 'i')

  return (
    args.current.reduce((maxIndex, attachment) => {
      const match = attachment.name.trim().match(pattern)
      const index = match?.[1] ? Number(match[1]) : Number.NaN

      if (!Number.isFinite(index)) {
        return maxIndex
      }

      return Math.max(maxIndex, index)
    }, 0) + 1
  )
}

function normalizeDraftAttachmentFile(args: {
  current: Array<AssistantDraftAttachment>
  file: File
}) {
  const { current, file } = args

  if (file.name.trim()) {
    return file
  }

  const extension = resolveFallbackFileExtension(file.type)
  const baseName = file.type.toLowerCase().startsWith('image/')
    ? 'screenshot'
    : 'attachment'
  const nextIndex = resolveNextFallbackAttachmentIndex({
    current,
    baseName,
  })
  const fallbackName = `${baseName}-${nextIndex}${extension ? `.${extension}` : ''}`

  return new File([file], fallbackName, {
    type: file.type || 'application/octet-stream',
    lastModified: file.lastModified || Date.now(),
  })
}

function wrapFileName(
  fileName: string,
  messages?: AssistantWorkbenchMessages,
) {
  return messages?.attachments.validation.wrapFileName(fileName) ?? `《${fileName}》`
}

function appendDraftAttachment(args: {
  current: Array<AssistantDraftAttachment>
  candidate: Pick<AssistantDraftAttachment, 'id' | 'name' | 'size' | 'mimeType'>
  duplicateMessage: string
  limitMessage: string
  oversizeMessage: string
}) {
  const existingIds = new Set(args.current.map((attachment) => attachment.id))

  if (existingIds.has(args.candidate.id)) {
    return {
      attachments: args.current,
      addedCount: 0,
      rejectedMessages: [args.duplicateMessage],
    } satisfies AppendAssistantFilesResult
  }

  if (args.candidate.size > ASSISTANT_MAX_FILE_SIZE) {
    return {
      attachments: args.current,
      addedCount: 0,
      rejectedMessages: [args.oversizeMessage],
    } satisfies AppendAssistantFilesResult
  }

  if (args.current.length >= ASSISTANT_MAX_ATTACHMENTS) {
    return {
      attachments: args.current,
      addedCount: 0,
      rejectedMessages: [args.limitMessage],
    } satisfies AppendAssistantFilesResult
  }

  return {
    attachments: args.current,
    addedCount: 1,
    rejectedMessages: [],
  } satisfies AppendAssistantFilesResult
}

export async function appendAssistantDraftAttachments(args: {
  current: Array<AssistantDraftAttachment>
  files: Array<File>
  messages?: AssistantWorkbenchMessages
}): Promise<AppendAssistantFilesResult> {
  let nextAttachments = args.current
  let addedCount = 0
  const rejectedMessages: string[] = []

  for (const file of args.files) {
    const normalizedFile = normalizeDraftAttachmentFile({
      current: nextAttachments,
      file,
    })
    const draftFileAttachment: AssistantDraftFileAttachment = {
      id: buildDraftFileAttachmentId(normalizedFile),
      kind: 'file',
      file: normalizedFile,
      name: normalizedFile.name,
      size: normalizedFile.size,
      sizeText: formatFileSize(normalizedFile.size),
      mimeType: normalizedFile.type || 'application/octet-stream',
      uploadStatus: 'uploading',
    }
    const wrappedFileName = wrapFileName(normalizedFile.name, args.messages)
    const validationMessages = args.messages?.attachments.validation

    const result = appendDraftAttachment({
      current: nextAttachments,
      candidate: draftFileAttachment,
      duplicateMessage:
        validationMessages?.duplicateFile(wrappedFileName) ??
        `以下文件已在待发送列表中，已自动跳过：${wrappedFileName}`,
      limitMessage:
        validationMessages?.attachmentLimit(ASSISTANT_MAX_ATTACHMENTS, 1) ??
        `最多添加 ${ASSISTANT_MAX_ATTACHMENTS} 份补充文件，超出的 1 份已忽略。`,
      oversizeMessage:
        validationMessages?.oversizeFile(
          ASSISTANT_MAX_FILE_SIZE_MB,
          wrappedFileName,
        ) ??
        `以下文件超过 ${ASSISTANT_MAX_FILE_SIZE_MB} MB，暂不支持上传：${wrappedFileName}`,
    })

    if (result.addedCount > 0) {
      const attachment = isImageAttachment(
        draftFileAttachment.mimeType,
        draftFileAttachment.name,
      )
        ? {
            ...draftFileAttachment,
            contentBase64: await readFileAsBase64(
              normalizedFile,
              args.messages,
            ),
          }
        : draftFileAttachment

      nextAttachments = [...nextAttachments, attachment]
      addedCount += 1
      rejectedMessages.push(...result.rejectedMessages)
      continue
    }

    nextAttachments = result.attachments
    addedCount += result.addedCount
    rejectedMessages.push(...result.rejectedMessages)
  }

  return {
    attachments: nextAttachments,
    addedCount,
    rejectedMessages,
  }
}
