'use client'

import { X } from 'lucide-react'
import {
  ViewerFileTypeIcon,
  resolveFileKind,
} from '@cew-lib/file-viewer-base'

import {
  createDocumentPreviewItemFromDocument,
  createFilePreviewItem,
  type DocumentsPreviewItem,
} from '#/components/assistant-workbench/document-preview.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  getAssistantWorkbenchMessages,
  getCurrentLanguage,
  useOptionalI18n,
} from '#/components/assistant-workbench/i18n/index.ts'
import type { AppMessages } from '#/components/assistant-workbench/i18n/index.ts'
import { cn } from '#/lib/utils.ts'
import type { AssistantWorkbenchAttachment } from '../../model'
import type { AssistantDraftAttachment } from './draft-attachments'

type AssistantWorkbenchMessages = AppMessages['assistantWorkbench']
const LEGACY_READY_STATUS = '\u5df2\u5c31\u7eea'

function getFallbackMessages() {
  return getAssistantWorkbenchMessages(getCurrentLanguage()).assistantWorkbench
}

export interface AssistantAnchorChatAttachmentItem {
  id: string
  name: string
  noteText?: string
  size?: number
  sizeText: string
  mimeType: string
  previewUrl?: string
  downloadUrl?: string
  previewItem?: DocumentsPreviewItem
  statusText?: string
  errorMessage?: string
}

function isDocumentServiceDownloadUrl(url?: string) {
  return Boolean(url?.includes('/doc/DocumentService/download?id='))
}

function splitAttachmentFileName(fileName: string, fallbackName: string) {
  const normalizedFileName = fileName.trim() || fallbackName
  const extensionStart = normalizedFileName.lastIndexOf('.')

  if (extensionStart <= 0 || extensionStart === normalizedFileName.length - 1) {
    return { baseName: normalizedFileName, extension: '' }
  }

  return {
    baseName: normalizedFileName.slice(0, extensionStart),
    extension: normalizedFileName.slice(extensionStart),
  }
}

function resolveAttachmentFileKindLabel(
  attachment: AssistantAnchorChatAttachmentItem,
  messages: AssistantWorkbenchMessages,
) {
  const fileKind =
    attachment.previewItem?.viewerFile.fileKind ??
    resolveFileKind(attachment.name)

  return messages.attachments.fileKinds[fileKind]
}

function buildAttachmentMetaText(
  attachment: AssistantAnchorChatAttachmentItem,
  messages: AssistantWorkbenchMessages,
) {
  const statusText =
    attachment.statusText &&
    attachment.statusText !== messages.attachments.status.ready &&
    attachment.statusText !== LEGACY_READY_STATUS
      ? attachment.statusText
      : undefined
  const sizeText = attachment.sizeText?.trim()

  return [
    statusText,
    resolveAttachmentFileKindLabel(attachment, messages),
    sizeText || undefined,
  ]
    .filter(Boolean)
    .join(' · ')
}

function resolveAttachmentPreviewItem(input: {
  id: string
  name: string
  size?: number
  previewUrl?: string
  downloadUrl?: string
  documentId?: string
}) {
  if (input.documentId) {
    return createDocumentPreviewItemFromDocument({
      id: input.documentId,
      name: input.name,
      size: input.size,
    })
  }

  if (input.previewUrl) {
    return createFilePreviewItem({
      id: input.id,
      name: input.name,
      size: input.size,
      url: input.previewUrl,
    })
  }

  if (input.downloadUrl) {
    return createFilePreviewItem({
      id: input.id,
      name: input.name,
      size: input.size,
      url: input.downloadUrl,
    })
  }

  return undefined
}

export function normalizeAssistantDraftAttachment(
  attachment: AssistantDraftAttachment,
  previewUrl?: string,
  messages?: AssistantWorkbenchMessages,
): AssistantAnchorChatAttachmentItem {
  const documentId = attachment.remoteFileId
  const statusMessages = messages?.attachments.status
  const fallbackStatusMessages = getFallbackMessages().attachments.status

  return {
    id: attachment.id,
    name: attachment.name,
    noteText: attachment.noteText,
    size: attachment.size,
    sizeText: attachment.sizeText,
    mimeType: attachment.mimeType,
    previewUrl,
    previewItem: resolveAttachmentPreviewItem({
      id: attachment.id,
      name: attachment.name,
      size: attachment.size,
      previewUrl,
      documentId,
    }),
    statusText:
      attachment.uploadStatus === 'uploading'
        ? (statusMessages?.uploading ?? fallbackStatusMessages.uploading)
        : attachment.uploadStatus === 'failed'
          ? (statusMessages?.failed ?? fallbackStatusMessages.failed)
          : attachment.uploadStatus === 'ready'
            ? (statusMessages?.ready ?? fallbackStatusMessages.ready)
            : undefined,
    errorMessage: attachment.errorMessage,
  }
}

export function normalizeAssistantMessageAttachment(
  attachment: AssistantWorkbenchAttachment,
): AssistantAnchorChatAttachmentItem {
  const documentId = isDocumentServiceDownloadUrl(attachment.downloadUrl)
    ? attachment.id
    : undefined

  return {
    id: attachment.id,
    name: attachment.name,
    noteText: attachment.noteText,
    sizeText: attachment.sizeText ?? '',
    mimeType: attachment.mimeType,
    previewUrl: attachment.previewUrl,
    downloadUrl: attachment.downloadUrl,
    previewItem: resolveAttachmentPreviewItem({
      id: attachment.id,
      name: attachment.name,
      previewUrl: attachment.previewUrl,
      downloadUrl: attachment.downloadUrl,
      documentId,
    }),
  }
}

export function AssistantAnchorChatAttachmentList(props: {
  attachments: Array<AssistantAnchorChatAttachmentItem>
  tone?: 'default' | 'inverted'
  layout?: 'compact' | 'composer' | 'stacked'
  onPreview?: (attachment: AssistantAnchorChatAttachmentItem) => void
  onRemove?: (attachmentId: string) => void
}) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const removable = Boolean(props.onRemove)
  const layout = props.layout ?? 'compact'
  const isComposerLayout = layout === 'composer'
  const isStackedLayout = layout === 'stacked'

  return (
    <div
      className={cn(
        isStackedLayout || isComposerLayout
          ? 'flex flex-col gap-2'
          : 'flex flex-wrap gap-1',
      )}
    >
      {props.attachments.map((attachment) => {
        const previewable = Boolean(attachment.previewItem)
        const downloadable = Boolean(attachment.downloadUrl)
        const noteText = attachment.noteText?.trim()
        const metaText = buildAttachmentMetaText(attachment, assistantMessages)
        const secondaryText =
          isStackedLayout || isComposerLayout ? metaText : noteText || metaText
        const fileName = splitAttachmentFileName(
          attachment.name,
          assistantMessages.attachments.unnamedFile,
        )
        const hasError = Boolean(
          attachment.errorMessage ||
          attachment.statusText ===
            assistantMessages.attachments.status.failed ||
          attachment.statusText ===
            getFallbackMessages().attachments.status.failed,
        )
        const isUploading =
          attachment.statusText ===
            assistantMessages.attachments.status.uploading ||
          attachment.statusText ===
            getFallbackMessages().attachments.status.uploading
        const cardClassName = cn(
          isComposerLayout
            ? 'group relative flex w-full flex-1 min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 pr-9 text-left shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
            : isStackedLayout
              ? 'group relative flex w-full flex-1 min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
              : 'relative inline-flex w-fit max-w-full min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
          layout === 'compact' && removable && 'pr-6',
          isStackedLayout && removable && 'pr-11',
          hasError
            ? 'border-destructive/35 bg-destructive/10 text-foreground'
            : props.tone === 'inverted'
              ? 'border-primary-foreground/14 bg-primary-foreground/10 text-primary-foreground'
              : isComposerLayout
                ? 'border-border/60 bg-muted/20 text-foreground hover:bg-muted/30'
                : isStackedLayout
                  ? 'border-border/60 bg-background text-foreground shadow-xs'
                  : 'border-border/70 bg-background/75 text-foreground',
        )
        const content = (
          <>
            <div
              className={cn(
                isComposerLayout
                  ? 'flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/45 bg-background/80'
                  : isStackedLayout
                    ? 'flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/45'
                    : 'flex size-6 shrink-0 items-center justify-center rounded-[7px] border border-border/45 bg-muted/45',
                props.tone === 'inverted' &&
                  'border-primary-foreground/12 bg-primary-foreground/12',
                hasError && 'border-destructive/20 bg-destructive/10',
              )}
            >
              <ViewerFileTypeIcon
                kind={attachment.previewItem?.viewerFile.fileKind}
                fileName={attachment.name}
                className={cn(
                  isStackedLayout || isComposerLayout ? 'h-5' : 'h-4',
                  'w-auto',
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                title={attachment.name}
                className={cn(
                  isComposerLayout
                    ? 'flex min-w-0 items-baseline text-[13px] leading-4.5 font-medium'
                    : isStackedLayout
                      ? 'flex min-w-0 items-baseline text-sm leading-5 font-medium'
                      : 'flex max-w-[104px] min-w-0 items-baseline text-[10px] leading-3.5 font-medium',
                )}
              >
                <span className="min-w-0 truncate">{fileName.baseName}</span>
                {fileName.extension ? (
                  <span className="shrink-0">{fileName.extension}</span>
                ) : null}
              </p>
              {isStackedLayout && noteText ? (
                <p
                  className={cn(
                    'mt-0.5 text-xs leading-4',
                    props.tone === 'inverted'
                      ? 'text-primary-foreground/80'
                      : 'text-foreground/78',
                  )}
                >
                  {noteText}
                </p>
              ) : null}
              {secondaryText ? (
                <p
                  className={cn(
                    isComposerLayout
                      ? 'mt-0.5 truncate text-[11px] leading-4'
                      : isStackedLayout
                        ? 'mt-0.5 truncate text-xs leading-4'
                        : 'w-full max-w-[104px] truncate text-[9px] leading-3',
                    !isComposerLayout && !isStackedLayout && !noteText
                      ? 'text-right'
                      : undefined,
                    props.tone === 'inverted'
                      ? 'text-primary-foreground/72'
                      : 'text-muted-foreground',
                  )}
                >
                  {secondaryText}
                </p>
              ) : null}
              {(isStackedLayout || isComposerLayout) && isUploading ? (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-primary/70" />
                </div>
              ) : null}
              {attachment.errorMessage ? (
                <p
                  className={cn(
                    isComposerLayout || isStackedLayout
                      ? 'mt-1 text-xs'
                      : 'mt-0.5 text-[11px]',
                    'text-destructive',
                  )}
                >
                  {attachment.errorMessage}
                </p>
              ) : null}
            </div>
          </>
        )

        const interactiveClassName = cn(
          cardClassName,
          'cursor-pointer',
          props.tone === 'inverted'
            ? 'hover:bg-primary-foreground/10'
            : isComposerLayout
              ? 'hover:border-primary/25 hover:bg-muted/35'
              : isStackedLayout
                ? 'hover:border-primary/20 hover:bg-muted/25'
                : 'hover:border-primary/20 hover:bg-muted/30',
        )

        const card = previewable ? (
          <button
            type="button"
            className={interactiveClassName}
            onClick={() => props.onPreview?.(attachment)}
            aria-label={assistantMessages.attachments.aria.preview(
              attachment.name,
            )}
          >
            {content}
          </button>
        ) : downloadable ? (
          <a
            href={attachment.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className={interactiveClassName}
            aria-label={assistantMessages.attachments.aria.download(
              attachment.name,
            )}
          >
            {content}
          </a>
        ) : (
          <div className={cardClassName}>{content}</div>
        )

        const removeButton = props.onRemove ? (
          <Button
            variant="ghost"
            size="icon-xs"
            className={cn(
              isComposerLayout
                ? 'absolute top-1.5 right-1.5 z-10 rounded-full bg-background/80 text-muted-foreground shadow-xs hover:bg-background hover:text-foreground'
                : isStackedLayout
                  ? 'absolute top-2.5 right-2.5 z-10 rounded-full'
                  : 'absolute top-0.5 right-0.5 z-10 rounded-full',
              props.tone === 'inverted'
                ? 'bg-primary/10 text-primary-foreground/80 hover:bg-primary-foreground/12 hover:text-primary-foreground'
                : isComposerLayout
                  ? 'bg-background/80 text-muted-foreground shadow-xs hover:bg-background hover:text-foreground'
                  : isStackedLayout
                    ? 'bg-background/90 text-muted-foreground shadow-xs hover:bg-muted'
                    : 'bg-background/90 text-muted-foreground shadow-xs hover:bg-muted',
            )}
            onClick={() => props.onRemove?.(attachment.id)}
            aria-label={assistantMessages.attachments.aria.remove(
              attachment.name,
            )}
          >
            <X data-icon />
          </Button>
        ) : null

        return (
          <div
            key={attachment.id}
            className={cn(
              isStackedLayout || isComposerLayout
                ? 'relative w-full'
                : 'relative inline-flex max-w-full',
            )}
          >
            {card}
            {removeButton}
          </div>
        )
      })}
    </div>
  )
}
