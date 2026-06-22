'use client'

import * as React from 'react'
import { ArrowUp, Paperclip, X } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { useOptionalI18n } from '#/components/assistant-workbench/i18n/index.ts'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip.tsx'
import { cn } from '#/lib/utils.ts'
import type { AssistantAnchorChatProtocol } from '../../model'
import { AssistantAnchorChatAttachmentList } from './attachment-list'
import type { AssistantAnchorChatAttachmentItem } from './attachment-list'
import {
  ASSISTANT_MAX_ATTACHMENTS,
  ASSISTANT_MAX_FILE_SIZE,
} from './draft-attachments'

const ASSISTANT_MAX_FILE_SIZE_MB = Math.floor(
  ASSISTANT_MAX_FILE_SIZE / 1024 / 1024,
)

function hasFilePayload(dataTransfer: DataTransfer | null | undefined) {
  return Array.from(dataTransfer?.types ?? []).includes('Files')
}

function resolveClipboardFiles(dataTransfer: DataTransfer | null | undefined) {
  const itemFiles = Array.from(dataTransfer?.items ?? [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null)

  if (itemFiles.length > 0) {
    return itemFiles
  }

  return Array.from(dataTransfer?.files ?? [])
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

function resolveNextPastedImageIndex(fileNames: Array<string>) {
  const pattern = /^screenshot-(\d+)(?:\.[^.]+)?$/i

  return (
    fileNames.reduce((maxIndex, fileName) => {
      const match = fileName.trim().match(pattern)
      const index = match?.[1] ? Number(match[1]) : Number.NaN

      if (!Number.isFinite(index)) {
        return maxIndex
      }

      return Math.max(maxIndex, index)
    }, 0) + 1
  )
}

function renameClipboardFiles(args: {
  files: Array<File>
  existingFileNames: Array<string>
}) {
  let nextIndex = resolveNextPastedImageIndex(args.existingFileNames)

  return args.files.map((file) => {
    if (!file.type.toLowerCase().startsWith('image/')) {
      return file
    }

    const extension = resolveFallbackFileExtension(file.type)
    const fileName = `screenshot-${nextIndex}${extension ? `.${extension}` : ''}`

    nextIndex += 1

    return new File([file], fileName, {
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified || Date.now(),
    })
  })
}

function resolveComposerPlaceholder(
  variant: 'docked' | 'landing',
  messages: ReturnType<typeof useOptionalI18n>['messages']['assistantWorkbench'],
) {
  if (variant === 'landing') {
    return messages.composer.placeholder.landing
  }

  return messages.composer.placeholder.docked
}

export const AssistantAnchorChatComposer = React.forwardRef<
  HTMLTextAreaElement,
  {
    composerValue: string
    protocol: AssistantAnchorChatProtocol | null
    attachments: Array<AssistantAnchorChatAttachmentItem>
    variant?: 'docked' | 'landing'
    className?: string
    canSend: boolean
    canCancel: boolean
    onComposerChange: (value: string) => void
    onAppendAttachments: (files: Array<File>) => void
    onPreviewAttachment: (attachment: AssistantAnchorChatAttachmentItem) => void
    onRemoveAttachment: (attachmentId: string) => void
    onClearAnchor: () => void
    onCancel: () => void
    onSend: () => void
    sendButtonLabel?: string
    hideAttachmentLimitHint?: boolean
    showAnchorSummary?: boolean
  }
>(function AssistantAnchorChatComposerImpl(props, ref) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const dragDepthRef = React.useRef(0)
  const [dragActive, setDragActive] = React.useState(false)
  const variant = props.variant ?? 'docked'
  const placeholder = resolveComposerPlaceholder(variant, assistantMessages)

  React.useEffect(() => {
    return () => {
      dragDepthRef.current = 0
      setDragActive(false)
    }
  }, [])

  const handleFileSelection = React.useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) {
        return
      }

      props.onAppendAttachments(Array.from(fileList))
    },
    [props],
  )

  const handleFileInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelection(event.target.files)
      event.target.value = ''
    },
    [handleFileSelection],
  )

  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = resolveClipboardFiles(event.clipboardData)

      if (files.length === 0) {
        return
      }

      event.preventDefault()
      props.onAppendAttachments(
        renameClipboardFiles({
          files,
          existingFileNames: props.attachments.map((attachment) =>
            attachment.name.trim(),
          ),
        }),
      )
    },
    [props],
  )

  const handleDragEnter = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFilePayload(event.dataTransfer)) {
        return
      }

      event.preventDefault()
      dragDepthRef.current += 1
      setDragActive(true)
    },
    [],
  )

  const handleDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFilePayload(event.dataTransfer)) {
        return
      }

      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      setDragActive(true)
    },
    [],
  )

  const handleDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFilePayload(event.dataTransfer)) {
        return
      }

      event.preventDefault()
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)

      if (dragDepthRef.current === 0) {
        setDragActive(false)
      }
    },
    [],
  )

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFilePayload(event.dataTransfer)) {
        return
      }

      event.preventDefault()
      dragDepthRef.current = 0
      setDragActive(false)
      handleFileSelection(event.dataTransfer.files)
    },
    [handleFileSelection],
  )

  const showAnchorSummary =
    props.showAnchorSummary === true &&
    Boolean(props.protocol) &&
    Boolean(props.protocol?.launchArea.area.title.trim())
  const showCancelButton = props.canCancel
  const actionButtonLabel = showCancelButton
    ? assistantMessages.composer.stopGenerating
    : (props.sendButtonLabel ?? assistantMessages.composer.send)
  const actionButtonState = showCancelButton
    ? 'cancel'
    : props.canSend
      ? 'ready'
      : 'disabled'
  const composerSurfaceClassName = cn(
    'rounded-[14px] border-border bg-background px-4 pt-4 pr-14 pb-14 shadow-[0_1px_2px_-1px_rgb(0_0_0/0.1),0_1px_3px_0_rgb(0_0_0/0.1)] transition-[border-color,box-shadow,ring-color] duration-150 focus-visible:border-primary/55 focus-visible:ring-3 focus-visible:ring-primary/20',
    variant === 'docked' ? 'min-h-28' : 'min-h-32',
  )
  const attachmentListLayout = variant === 'docked' ? 'composer' : 'stacked'
  const handleComposerKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) {
        return
      }

      if (event.nativeEvent.isComposing) {
        return
      }

      event.preventDefault()

      if (props.canSend) {
        props.onSend()
      }
    },
    [props],
  )

  return (
    <div className={cn('w-full', props.className)}>
      {showAnchorSummary ? (
        <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-foreground">
                {assistantMessages.composer.currentTargetArea(
                  props.protocol?.launchArea.area.title ?? '',
                )}
              </p>
              {props.protocol?.launchArea.area.description ? (
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {props.protocol.launchArea.area.description}
                </p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6"
              onClick={props.onClearAnchor}
              aria-label={assistantMessages.composer.clearCurrentArea}
            >
              <X data-icon />
            </Button>
          </div>
        </div>
      ) : null}
      <div
        className="relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Textarea
          ref={ref}
          value={props.composerValue}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            props.onComposerChange(event.target.value)
          }
          onKeyDown={handleComposerKeyDown}
          onPaste={handlePaste}
          rows={4}
          className={cn(
            'resize-none',
            composerSurfaceClassName,
            dragActive && 'border-primary bg-primary/5 ring-3 ring-ring/20',
          )}
          placeholder={placeholder}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
          <div className="pointer-events-auto flex min-w-0 items-center gap-2">
            <TooltipProvider delay={0}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 cursor-pointer rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      aria-label={assistantMessages.composer.addSupplementFiles}
                    />
                  }
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="size-3.5" data-icon />
                </TooltipTrigger>
                <TooltipContent className="flex-col items-start gap-1 px-3 py-2 text-left">
                  <span className="text-xs font-medium text-background">
                    {assistantMessages.composer.uploadMaterials}
                  </span>
                  <span className="text-[11px] text-background/80">
                    {assistantMessages.composer.attachmentLimitHint(
                      ASSISTANT_MAX_ATTACHMENTS,
                      ASSISTANT_MAX_FILE_SIZE_MB,
                    )}
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'pointer-events-auto shrink-0 rounded-full transition-colors duration-200 disabled:opacity-100',
              'size-10',
              actionButtonState === 'ready' &&
                'bg-[linear-gradient(45deg,#01738E_0%,#5BC864_100%)] text-white shadow-sm hover:bg-[linear-gradient(45deg,#01738E_0%,#5BC864_100%)] hover:text-white',
              actionButtonState === 'cancel' &&
                'border-2 border-primary/28 bg-background text-primary shadow-none ring-4 ring-primary/14 hover:bg-primary/5 hover:text-primary',
              actionButtonState === 'disabled' &&
                'bg-muted text-muted-foreground/62 shadow-none hover:bg-muted hover:text-muted-foreground/62',
            )}
            aria-label={actionButtonLabel}
            title={actionButtonLabel}
            onClick={showCancelButton ? props.onCancel : props.onSend}
            disabled={!showCancelButton && !props.canSend}
          >
            {showCancelButton ? (
              <span
                aria-hidden="true"
                className="relative flex size-5 items-center justify-center"
              >
                <span className="absolute inset-0 rounded-full border-[2.5px] border-primary/16" />
                <span className="absolute inset-0 rounded-full border-[2.5px] border-transparent border-t-primary border-r-primary/65 animate-spin motion-reduce:animate-none" />
                <span className="absolute inset-[3px] rounded-full bg-background" />
                <span className="relative size-2.5 rounded-[3px] bg-current" />
              </span>
            ) : (
              <ArrowUp className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {props.attachments.length > 0 ? (
        <div
          className={cn(
            'mt-2 overflow-y-auto bg-background/62 backdrop-blur supports-[backdrop-filter]:bg-background/56',
            variant === 'docked'
              ? 'max-h-36 rounded-[18px] p-2'
              : 'rounded-xl p-2.5',
          )}
        >
          <AssistantAnchorChatAttachmentList
            attachments={props.attachments}
            layout={attachmentListLayout}
            onPreview={props.onPreviewAttachment}
            onRemove={props.onRemoveAttachment}
          />
        </div>
      ) : null}
    </div>
  )
})
