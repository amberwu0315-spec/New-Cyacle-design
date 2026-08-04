'use client'

import * as React from 'react'
import {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  EllipsisVertical,
  History,
  ListChecks,
  LoaderCircle,
  MessageSquarePlus,
  X,
  Zap,
} from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip.tsx'
import { DocumentPreviewDialog } from '#/components/assistant-workbench/document-preview.tsx'
import type { DocumentsPreviewItem } from '#/components/assistant-workbench/document-preview.tsx'
import { useOptionalI18n } from '#/components/assistant-workbench/i18n/index.ts'
import { cn } from '#/lib/utils.ts'

import { AssistantDialogRenderer } from '../../ui/assistant-dialog-renderer'
import { AssistantEmbeddedRenderer } from '../../ui/assistant-embedded-renderer'
import { AssistantSheetRenderer } from '../../ui/assistant-sheet-renderer'
import type {
  AssistantAnchorChatProtocol,
  AssistantDisplayAnchorItem,
  AssistantPendingInteraction,
  AssistantRunProgressGroup,
  AssistantRunProgressLoadState,
  AssistantRunState,
  AssistantStreamProgressItem,
  AssistantThreadSummary,
  AssistantWorkbenchMessage,
  AssistantWorkbenchRenderMode,
} from '../../model'
import { normalizeAssistantDraftAttachment } from './attachment-list'
import type { AssistantAnchorChatAttachmentItem } from './attachment-list'
import { AssistantAnchorChatComposer } from './composer'
import type { AssistantDraftAttachment } from './draft-attachments'
import {
  AssistantAnchorChatMessageList,
  ChatMarkdownContent,
} from './message-list'

const INITIAL_VISIBLE_MESSAGE_COUNT = 100
const VISIBLE_MESSAGE_BATCH_SIZE = 50
type AssistantWorkbenchMessages = ReturnType<
  typeof useOptionalI18n
>['messages']['assistantWorkbench']

function formatThreadTime(value: string, language: string) {
  return new Date(value).toLocaleString(language, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function summarizeThread(
  thread: AssistantThreadSummary,
  messages: AssistantWorkbenchMessages,
) {
  return thread.summary.trim() || messages.renderer.newThread
}

function getAnchorSummaryTitle(
  anchorCount: number,
  messages: AssistantWorkbenchMessages,
) {
  return messages.renderer.selectedArea(anchorCount)
}

type SubmitInteractionHandler = (args: {
  interactionId: string
  selectedOptionIds: Array<string>
}) => Promise<unknown> | void

function formatProgressItemName(
  name: string,
  messages: AssistantWorkbenchMessages,
) {
  const normalizedName = name.trim()

  if (!normalizedName) {
    return messages.renderer.progressUpdateFallback
  }

  if (normalizedName === 'progress.update') {
    return messages.renderer.progressItemNames.progressUpdate
  }

  if (normalizedName === 'tool.call') {
    return messages.renderer.progressItemNames.toolCall
  }

  if (normalizedName === 'workflow.run') {
    return messages.renderer.progressItemNames.workflowRun
  }

  if (normalizedName === 'workflow.step') {
    return messages.renderer.progressItemNames.workflowStep
  }

  if (normalizedName.startsWith('section.')) {
    const sectionName = normalizedName.slice('section.'.length).trim()

    return messages.renderer.sectionLabel(sectionName)
  }

  return normalizedName
}

function formatProgressItemStatus(
  status: string | undefined,
  messages: AssistantWorkbenchMessages,
) {
  const normalizedStatus = status?.trim()

  if (!normalizedStatus) {
    return null
  }

  if (normalizedStatus === 'cancelled') {
    return messages.renderer.progressStatuses.cancelled
  }

  if (normalizedStatus === 'completed') {
    return messages.renderer.progressStatuses.completed
  }

  if (normalizedStatus === 'failed') {
    return messages.renderer.progressStatuses.failed
  }

  if (normalizedStatus === 'queued') {
    return messages.renderer.progressStatuses.queued
  }

  if (normalizedStatus === 'running') {
    return messages.renderer.progressStatuses.running
  }

  return normalizedStatus
}

function isVisiblePendingInteraction(interaction: AssistantPendingInteraction) {
  if (interaction.status === 'PENDING') {
    return true
  }

  return (
    interaction.status === 'UNSPECIFIED' &&
    !interaction.respondedAt &&
    interaction.options.length > 0
  )
}

function resolveProgressItemTitle(
  item: AssistantStreamProgressItem,
  messages: AssistantWorkbenchMessages,
) {
  const rawTitle = item.title.trim()
  const rawMessage = item.message?.trim() ?? ''

  if (!rawTitle || rawTitle === item.name.trim()) {
    return rawMessage || formatProgressItemName(item.name, messages)
  }

  return rawTitle
}

function buildProgressFeedSummary(
  items: Array<AssistantStreamProgressItem>,
  messages: AssistantWorkbenchMessages,
) {
  if (items.length === 0) {
    return ''
  }

  const latestItem = [...items].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  )[0]
  const title = resolveProgressItemTitle(latestItem, messages)
  const countLabel = messages.renderer.updateCount(items.length)

  return title ? `${countLabel} · ${title}` : countLabel
}

function getProgressItemToneClass(item: AssistantStreamProgressItem) {
  if (item.status === 'failed' || item.level === 'error') {
    return 'text-destructive'
  }

  if (item.level === 'warning') {
    return 'text-amber-600'
  }

  if (item.status === 'running') {
    return 'text-primary'
  }

  return 'text-muted-foreground'
}

type ContextPromptDensity = 'landing' | 'docked'

function ActiveAnchorSummary(props: {
  anchors: Array<AssistantDisplayAnchorItem>
  density: ContextPromptDensity
}) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const labels = props.anchors.map((anchor) => anchor.label)
  const previewText =
    labels.length <= 2
      ? assistantMessages.renderer.anchorPreview(labels, false)
      : assistantMessages.renderer.anchorPreview(labels.slice(0, 2), true)

  if (props.anchors.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'flex min-w-0 items-start',
        props.density === 'docked' && 'items-center',
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-bold text-primary">
          {getAnchorSummaryTitle(props.anchors.length, assistantMessages)}
        </p>
        <p
          className={cn(
            'mt-0.5 truncate text-sm font-semibold leading-5 text-foreground',
            props.density === 'landing' && 'text-sm text-foreground/80',
          )}
        >
          {previewText}
        </p>
      </div>
    </div>
  )
}

function SuggestionChips(props: {
  suggestions: NonNullable<
    AssistantAnchorChatProtocol['launchArea']['suggestions']
  >
  density: ContextPromptDensity
  separated?: boolean
  disabled?: boolean
  onSendSuggestion?: (content: string) => void
}) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  if (props.suggestions.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        props.separated &&
          (props.density === 'landing'
            ? 'mt-3 border-t border-border/60 pt-3'
            : 'mt-2 border-t border-border/50 pt-2'),
      )}
    >
      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
        <Zap className="size-3.5 text-primary/80" />
        {assistantMessages.renderer.quickOptions}
      </p>
      <div
        className={cn(
          'mt-2 flex flex-wrap',
          props.density === 'landing' ? 'gap-2' : 'gap-1.5',
        )}
      >
        {props.suggestions.map((suggestion, index) => (
          <Button
            key={`${suggestion.content}:${index}`}
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              'h-auto max-w-full whitespace-normal rounded-full border-border/75 bg-background px-3 text-left text-xs shadow-none hover:border-primary/30 hover:bg-primary/5',
              props.density === 'landing' ? 'py-1.5' : 'py-1',
            )}
            disabled={props.disabled}
            onClick={() => props.onSendSuggestion?.(suggestion.content)}
          >
            {suggestion.content}
          </Button>
        ))}
      </div>
    </div>
  )
}

function ContextPromptStrip(props: {
  anchors: Array<AssistantDisplayAnchorItem>
  suggestions: NonNullable<
    AssistantAnchorChatProtocol['launchArea']['suggestions']
  >
  density: ContextPromptDensity
  disabled?: boolean
  onClearAnchor?: () => void
  onSendSuggestion?: (content: string) => void
}) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const hasAnchors = props.anchors.length > 0
  const hasSuggestions = props.suggestions.length > 0

  if (!hasAnchors && !hasSuggestions) {
    return null
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border-0 bg-muted shadow-none backdrop-blur supports-[backdrop-filter]:bg-muted',
        props.density === 'landing' ? 'px-3.5 py-3.5' : 'px-3 py-2.5',
        hasAnchors && props.onClearAnchor && 'pr-10',
      )}
    >
      {hasAnchors && props.onClearAnchor ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-2 right-2 size-7 rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          aria-label={assistantMessages.renderer.cancelSelectedArea}
          disabled={props.disabled}
          onClick={props.onClearAnchor}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
      {hasAnchors ? (
        <ActiveAnchorSummary anchors={props.anchors} density={props.density} />
      ) : null}
      {hasSuggestions ? (
        <SuggestionChips
          suggestions={props.suggestions}
          density={props.density}
          separated={hasAnchors}
          disabled={props.disabled}
          onSendSuggestion={props.onSendSuggestion}
        />
      ) : null}
    </div>
  )
}

function ThreadHistoryPopover(props: {
  threads: Array<AssistantThreadSummary>
  activeThreadId?: string | null
  currentRun?: AssistantRunState | null
  onSelectThread?: (threadId: string) => void
  tooltipOpen: boolean
  onTooltipOpenChange?: (open: boolean) => void
  onDismissTooltip?: () => void
}) {
  const { language, messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const [open, setOpen] = React.useState(false)
  const deferredThreads = React.useDeferredValue(props.threads)
  const buttonClassName = cn(
    'size-7 rounded-lg border border-transparent bg-transparent text-black shadow-none transition-colors hover:bg-white/28 hover:text-black [&_svg]:!size-3.5 [&_svg]:!text-black',
    open && 'bg-white/28 text-black',
  )
  const threadListContent = React.useMemo(() => {
    if (!open) {
      return null
    }

    if (deferredThreads.length === 0) {
      return (
        <div className="rounded-lg border border-dashed bg-background px-3 py-4 text-[11px] text-muted-foreground">
          {assistantMessages.renderer.noHistory}
        </div>
      )
    }

    return deferredThreads.map((thread) => {
      const active = thread.threadId === props.activeThreadId

      return (
        <button
          key={thread.threadId}
          type="button"
          className={cn(
            'rounded-lg border px-3 py-2.5 text-left transition-colors',
            active
              ? 'border-primary/30 bg-primary/8 shadow-xs'
              : 'border-transparent bg-background hover:border-border hover:bg-muted/35',
          )}
          onClick={() => {
            props.onSelectThread?.(thread.threadId)
            setOpen(false)
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="line-clamp-1 text-xs font-medium text-foreground">
              {summarizeThread(thread, assistantMessages)}
            </p>
            {active && props.currentRun?.status === 'running' ? (
              <LoaderCircle className="size-3 animate-spin text-primary" />
            ) : active ? (
              <span className="text-[10px] font-medium text-primary">
                {assistantMessages.renderer.current}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatThreadTime(thread.createdAt, language)}
          </p>
        </button>
      )
    })
  }, [
    deferredThreads,
    open,
    props.activeThreadId,
    props.currentRun?.status,
    props.onSelectThread,
  ])

  return (
    <Tooltip
      open={props.tooltipOpen && !open}
      onOpenChange={props.onTooltipOpenChange}
    >
      <Popover
        open={open}
        onOpenChange={(nextOpen: boolean) => {
          setOpen(nextOpen)

          if (nextOpen) {
            props.onDismissTooltip?.()
          }
        }}
      >
        <PopoverTrigger
          render={
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={buttonClassName}
                  aria-label={assistantMessages.renderer.viewHistory}
                  onClick={props.onDismissTooltip}
                />
              }
            />
          }
        >
          <History className="size-3.5" />
        </PopoverTrigger>

        <PopoverContent
          align="end"
          side="bottom"
          sideOffset={8}
          className="w-[340px] gap-0 overflow-hidden rounded-lg p-0 shadow-lg"
        >
          <div className="border-b bg-muted/20 px-3 py-2.5">
            <p className="text-sm font-semibold text-foreground">
              {assistantMessages.renderer.history}
            </p>
          </div>

          <div className="max-h-[360px] overflow-auto p-2">
            <div className="flex flex-col gap-1.5">{threadListContent}</div>
          </div>
        </PopoverContent>
      </Popover>
      <TooltipContent>{assistantMessages.renderer.history}</TooltipContent>
    </Tooltip>
  )
}

type ThreadControlTooltipKey = 'history' | 'create'

function ProgressFeed(props: { items: Array<AssistantStreamProgressItem> }) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const [open, setOpen] = React.useState(false)

  if (props.items.length === 0) {
    return null
  }

  const orderedItems = [...props.items].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  )
  const summary = buildProgressFeedSummary(props.items, assistantMessages)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-1">
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-1.5 border-0 bg-transparent px-0 py-1 text-left text-[11px] leading-5 text-muted-foreground/90 shadow-none transition-colors hover:bg-transparent hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
          />
        }
      >
        <span className="truncate font-medium text-muted-foreground">
          {assistantMessages.renderer.runProgress}
        </span>
        {summary ? (
          <span className="min-w-0 truncate text-muted-foreground/80">
            {summary}
          </span>
        ) : null}
        {open ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden">
        <div className="mt-1.5 border-l border-border/60 pl-3">
          <div className="flex max-h-56 flex-col gap-3 overflow-auto py-0.5 pr-1">
            {orderedItems.map((item) => {
              const itemName = formatProgressItemName(
                item.name,
                assistantMessages,
              )
              const itemStatus = formatProgressItemStatus(
                item.status,
                assistantMessages,
              )
              const itemTitle = resolveProgressItemTitle(
                item,
                assistantMessages,
              )
              const itemMessage = item.message?.trim() ?? ''
              const showMessage = itemMessage && itemMessage !== itemTitle
              const toneClassName = getProgressItemToneClass(item)

              return (
                <div key={item.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute -left-[17px] top-1.5 size-2 rounded-full border border-background bg-muted-foreground/35',
                      item.status === 'failed' || item.level === 'error'
                        ? 'bg-destructive'
                        : item.level === 'warning'
                          ? 'bg-amber-500'
                          : item.status === 'running'
                            ? 'bg-primary'
                            : 'bg-muted-foreground/35',
                    )}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="h-5 rounded-full px-2 text-[10px]"
                    >
                      {itemName}
                    </Badge>
                    {itemStatus ? (
                      <span
                        className={cn('text-[10px] font-medium', toneClassName)}
                      >
                        {itemStatus}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs font-medium text-foreground">
                    {itemTitle}
                  </p>
                  {showMessage ? (
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      {itemMessage}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function AssistantInteractionCards(props: {
  interactions: Array<AssistantPendingInteraction>
  disabled?: boolean
  onCancel?: () => void
  onSubmit?: SubmitInteractionHandler
}) {
  const pendingInteractions = props.interactions.filter(
    isVisiblePendingInteraction,
  )

  if (pendingInteractions.length === 0) {
    return null
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {pendingInteractions.map((interaction) => (
        <InteractionCard
          key={interaction.id}
          interaction={interaction}
          disabled={props.disabled}
          onCancel={props.onCancel}
          onSubmit={props.onSubmit}
        />
      ))}
    </div>
  )
}

function InteractionCard(props: {
  interaction: AssistantPendingInteraction
  disabled?: boolean
  onCancel?: () => void
  onSubmit?: SubmitInteractionHandler
}) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const [selectedOptionIds, setSelectedOptionIds] = React.useState<
    Array<string>
  >([])
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const mountedRef = React.useRef(true)
  const multiple = props.interaction.selectionMode === 'MULTIPLE'
  const interactionDisabled = props.disabled || submitting || submitted
  const canSubmit =
    Boolean(props.onSubmit) &&
    selectedOptionIds.length > 0 &&
    !interactionDisabled
  const selectionControlType = multiple ? 'checkbox' : 'radio'

  React.useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleSubmit = React.useCallback(() => {
    if (!canSubmit || !props.onSubmit) {
      return
    }

    setSubmitting(true)
    setSubmitted(false)

    const handleSubmitted = () => {
      if (!mountedRef.current) {
        return
      }

      setSubmitting(false)
      setSubmitted(true)
    }

    const handleSubmitFailed = () => {
      if (!mountedRef.current) {
        return
      }

      setSubmitting(false)
      setSubmitted(false)
    }

    try {
      const result = props.onSubmit({
        interactionId: props.interaction.id,
        selectedOptionIds,
      })
      const maybePromise = result as PromiseLike<unknown> | undefined

      if (maybePromise && typeof maybePromise.then === 'function') {
        void Promise.resolve(maybePromise).then(
          handleSubmitted,
          handleSubmitFailed,
        )
        return
      }

      handleSubmitted()
    } catch {
      handleSubmitFailed()
    }
  }, [canSubmit, props.interaction.id, props.onSubmit, selectedOptionIds])

  return (
    <div className="flex max-h-[min(68vh,560px)] min-h-0 flex-col overflow-hidden rounded-xl border border-border/65 bg-background/96 shadow-xs supports-[backdrop-filter]:bg-background/90">
      <div className="flex max-h-[min(32vh,260px)] shrink-0 items-start gap-2.5 overflow-hidden border-b border-border/45 px-3 py-2.5">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ListChecks className="size-3.5" />
        </span>
        <div className="transparent-scrollbar-track min-w-0 flex-1 overflow-auto pr-1">
          <div className="flex min-h-6 items-center">
            <p className="text-[13px] font-semibold leading-[18px] text-foreground">
              {props.interaction.title}
            </p>
          </div>
          {props.interaction.body ? (
            <ChatMarkdownContent
              markdown={props.interaction.body}
              tone="muted"
              className="text-[11px] leading-4"
            />
          ) : null}
        </div>
        {props.onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="-mt-0.5 size-7 rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            aria-label={assistantMessages.renderer.closeSelection}
            disabled={interactionDisabled}
            onClick={props.onCancel}
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="transparent-scrollbar-track min-h-[156px] flex-1 overflow-auto px-3 py-2">
        <div className="flex flex-col gap-1.5">
          {props.interaction.options.map((option) => {
            const checked = selectedOptionIds.includes(option.id)
            const disabled = interactionDisabled || Boolean(option.disabled)

            return (
              <label
                key={option.id}
                className={cn(
                  'group grid cursor-pointer grid-cols-[16px_minmax(0,1fr)] items-start gap-2.5 rounded-md bg-muted/35 px-3 py-2 text-left transition-colors',
                  'hover:bg-muted/55 focus-within:bg-muted/55 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/30 focus-within:ring-inset',
                  disabled && 'cursor-not-allowed opacity-50',
                  checked && 'bg-primary/8 ring-1 ring-primary/25',
                )}
              >
                <span className="relative mt-0.5 flex size-3.5 shrink-0">
                  <input
                    type={selectionControlType}
                    className="absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => {
                      setSelectedOptionIds((current) => {
                        if (multiple) {
                          return checked
                            ? current.filter((id) => id !== option.id)
                            : [...current, option.id]
                        }

                        return checked ? current : [option.id]
                      })
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none flex size-3.5 items-center justify-center border border-border/75 bg-background text-transparent transition-colors',
                      multiple ? 'rounded-[5px]' : 'rounded-full',
                      !disabled && 'group-hover:border-primary/45',
                      checked &&
                        'border-primary bg-primary text-primary-foreground',
                    )}
                  >
                    {multiple ? (
                      <Check className="size-2.5" />
                    ) : (
                      <span className="size-1 rounded-full bg-current" />
                    )}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold leading-[18px] text-foreground">
                    {option.label}
                  </p>
                  {option.description ? (
                    <ChatMarkdownContent
                      markdown={option.description}
                      tone="muted"
                      className="mt-1 text-[11px] leading-[18px] text-muted-foreground/85"
                    />
                  ) : null}
                </div>
              </label>
            )
          })}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/45 bg-background/78 px-3 py-2.5">
        {props.onCancel ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 rounded-md px-4 text-xs shadow-none"
            disabled={interactionDisabled}
            onClick={props.onCancel}
          >
            {assistantMessages.renderer.cancel}
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 rounded-md px-4 text-xs shadow-none disabled:opacity-45"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting ? (
            <>
              <LoaderCircle className="size-3.5 animate-spin" />
              {assistantMessages.renderer.submitting}
            </>
          ) : submitted ? (
            assistantMessages.renderer.submitted
          ) : (
            assistantMessages.renderer.confirm
          )}
        </Button>
      </div>
    </div>
  )
}

export interface AssistantAnchorChatRendererProps {
  open: boolean
  renderMode: AssistantWorkbenchRenderMode
  protocol: AssistantAnchorChatProtocol | null
  description?: string | null
  messages: Array<AssistantWorkbenchMessage>
  threads?: Array<AssistantThreadSummary>
  activeThreadId?: string | null
  currentRun?: AssistantRunState | null
  progressItems?: Array<AssistantStreamProgressItem>
  runProgressStateByRunId?: Record<string, AssistantRunProgressLoadState>
  pendingInteractions?: Array<AssistantPendingInteraction>
  loadingThread?: boolean
  activeAnchors?: Array<AssistantDisplayAnchorItem>
  composerValue: string
  attachments: Array<AssistantDraftAttachment>
  sending: boolean
  focusSignal?: unknown
  onComposerChange: (value: string) => void
  onAppendAttachments: (files: Array<File>) => Promise<void>
  onRemoveAttachment: (attachmentId: string) => void
  onClearAnchor: () => void
  onOpenChange: (open: boolean) => void
  onRenderModeChange: (mode: AssistantWorkbenchRenderMode) => void
  onSend: () => void
  onSendSuggestion?: (content: string) => void
  onLoadRunProgress?: (runId: string) => Promise<unknown>
  renderRunProgressContent?: (args: {
    runId: string
    groups: Array<AssistantRunProgressGroup>
    defaultContent: React.ReactNode
  }) => React.ReactNode
  onSelectThread?: (threadId: string) => void
  onCreateThread?: () => void
  onCancelRun?: () => void
  onSubmitInteraction?: SubmitInteractionHandler
  panelAriaLabel?: string
  panelDescription?: string
  dialogPanelClassName?: string
  sheetPanelClassName?: string
  allowModeSwitching?: boolean
  showCloseButtonWhenLocked?: boolean
  headerClassName?: string
  additionalHeaderActions?: React.ReactNode
  sendButtonLabel?: string
  hideAttachmentLimitHint?: boolean
  forceCanSend?: boolean
  canSwitchThreads?: boolean
}

export function AssistantAnchorChatRenderer(
  props: AssistantAnchorChatRendererProps,
) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const composerRef = React.useRef<HTMLTextAreaElement | null>(null)
  const messageViewportRef = React.useRef<HTMLDivElement | null>(null)
  const pendingHistoryExpansionRef = React.useRef<null | {
    previousScrollHeight: number
    previousScrollTop: number
  }>(null)
  const [previewItem, setPreviewItem] =
    React.useState<DocumentsPreviewItem | null>(null)
  const [activeThreadControlTooltip, setActiveThreadControlTooltip] =
    React.useState<ThreadControlTooltipKey | null>(null)
  const [visibleMessageCount, setVisibleMessageCount] = React.useState(() =>
    Math.min(props.messages.length, INITIAL_VISIBLE_MESSAGE_COUNT),
  )
  const [loadingOlderMessages, setLoadingOlderMessages] = React.useState(false)
  const compactHeaderActionClassName =
    'size-7 rounded-lg border border-transparent bg-transparent text-black shadow-none transition-colors hover:bg-white/28 hover:text-black [&_svg]:!size-3.5 [&_svg]:!text-black'

  const draftAttachmentPreviewUrls = React.useMemo(() => {
    const previewUrls = new Map<string, string>()

    props.attachments.forEach((attachment) => {
      if (attachment.contentBase64) {
        previewUrls.set(
          attachment.id,
          `data:${attachment.mimeType};base64,${attachment.contentBase64}`,
        )
        return
      }
    })

    return previewUrls
  }, [props.attachments])

  React.useEffect(() => {
    return () => {
      draftAttachmentPreviewUrls.forEach((previewUrl) => {
        if (previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl)
        }
      })
    }
  }, [draftAttachmentPreviewUrls])

  React.useEffect(() => {
    if (props.open) {
      return
    }

    setActiveThreadControlTooltip(null)
    setPreviewItem(null)
  }, [props.open])

  const handlePreviewAttachment = React.useCallback(
    (attachment: AssistantAnchorChatAttachmentItem) => {
      if (!attachment.previewItem) {
        return
      }

      setPreviewItem(attachment.previewItem)
    },
    [],
  )

  const updateThreadControlTooltip = React.useCallback(
    (tooltip: ThreadControlTooltipKey, nextOpen: boolean) => {
      setActiveThreadControlTooltip((current) => {
        if (nextOpen) {
          return tooltip
        }

        return current === tooltip ? null : current
      })
    },
    [],
  )

  const clearThreadControlTooltip = React.useCallback(() => {
    setActiveThreadControlTooltip(null)
  }, [])

  const handleRequestFocus = React.useCallback(() => {
    const textarea = composerRef.current

    if (textarea instanceof HTMLTextAreaElement) {
      textarea.focus()
      textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    }
  }, [])

  React.useEffect(() => {
    if (!props.open) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      handleRequestFocus()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [handleRequestFocus, props.focusSignal, props.open])

  const hasConversationRecords =
    props.messages.length > 0 ||
    Boolean(props.progressItems?.length) ||
    Boolean(props.pendingInteractions?.length)
  const showThreadLoadingState =
    Boolean(props.loadingThread) &&
    Boolean(props.activeThreadId) &&
    !hasConversationRecords
  const hasConversationContent =
    hasConversationRecords || showThreadLoadingState

  const handleCreateThread = React.useCallback(() => {
    clearThreadControlTooltip()

    if (!hasConversationContent) {
      props.onClearAnchor()

      window.requestAnimationFrame(() => {
        handleRequestFocus()
      })
      return
    }

    const result = props.onCreateThread?.()

    window.requestAnimationFrame(() => {
      handleRequestFocus()
    })

    void Promise.resolve(result).finally(() => {
      window.requestAnimationFrame(() => {
        handleRequestFocus()
      })
    })
  }, [
    clearThreadControlTooltip,
    handleRequestFocus,
    hasConversationContent,
    props,
  ])

  React.useEffect(() => {
    setVisibleMessageCount((current) => {
      if (props.messages.length === 0) {
        return 0
      }

      const minimumWindow = Math.min(
        props.messages.length,
        INITIAL_VISIBLE_MESSAGE_COUNT,
      )

      if (current === 0) {
        return minimumWindow
      }

      return Math.min(props.messages.length, Math.max(current, minimumWindow))
    })
  }, [props.messages.length])

  const visibleMessageStartIndex = Math.max(
    props.messages.length - visibleMessageCount,
    0,
  )

  const visibleMessages = React.useMemo(
    () => props.messages.slice(visibleMessageStartIndex),
    [props.messages, visibleMessageStartIndex],
  )
  const viewportStateKey = React.useMemo(
    () =>
      [
        props.activeThreadId ?? 'thread-draft',
        props.protocol?.launchArea.area.id ?? 'no-anchor',
        props.protocol?.session?.activationId ?? 'no-session',
        props.open ? 'open' : 'closed',
        String(props.focusSignal ?? 'no-focus'),
      ].join(':'),
    [
      props.activeThreadId,
      props.focusSignal,
      props.open,
      props.protocol?.launchArea.area.id,
      props.protocol?.session?.activationId,
    ],
  )

  React.useLayoutEffect(() => {
    const pendingExpansion = pendingHistoryExpansionRef.current
    const viewport = messageViewportRef.current

    if (!pendingExpansion || !(viewport instanceof HTMLDivElement)) {
      return
    }

    const heightDelta =
      viewport.scrollHeight - pendingExpansion.previousScrollHeight

    viewport.scrollTop = pendingExpansion.previousScrollTop + heightDelta
    pendingHistoryExpansionRef.current = null
    setLoadingOlderMessages(false)
  }, [visibleMessageStartIndex, visibleMessages.length])

  const lockedEmbedded =
    props.renderMode === 'embedded' && props.allowModeSwitching === false

  const canSend =
    !props.loadingThread &&
    !props.sending &&
    (props.forceCanSend ||
      Boolean(props.composerValue.trim()) ||
      props.attachments.length > 0)

  const draftAttachments = props.attachments.map((attachment) =>
    normalizeAssistantDraftAttachment(
      attachment,
      draftAttachmentPreviewUrls.get(attachment.id),
      assistantMessages,
    ),
  )

  const handleReachTop = React.useCallback(() => {
    if (loadingOlderMessages || visibleMessageStartIndex === 0) {
      return
    }

    const viewport = messageViewportRef.current

    if (viewport instanceof HTMLDivElement) {
      pendingHistoryExpansionRef.current = {
        previousScrollHeight: viewport.scrollHeight,
        previousScrollTop: viewport.scrollTop,
      }
    }

    setLoadingOlderMessages(true)
    setVisibleMessageCount((current) =>
      Math.min(props.messages.length, current + VISIBLE_MESSAGE_BATCH_SIZE),
    )
  }, [loadingOlderMessages, props.messages.length, visibleMessageStartIndex])

  let headerActions: React.ReactNode = null

  if (!lockedEmbedded) {
    if (props.allowModeSwitching === false) {
      headerActions =
        props.showCloseButtonWhenLocked === false ? null : (
          <Button
            variant="ghost"
            size="icon-sm"
            className={compactHeaderActionClassName}
            aria-label={assistantMessages.renderer.closeAssistant}
            onClick={() => props.onOpenChange(false)}
          >
            <X data-icon />
          </Button>
        )
    } else {
      headerActions = (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className={compactHeaderActionClassName}
                aria-label={assistantMessages.renderer.displayMode}
              />
            }
          >
            <EllipsisVertical data-icon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuRadioGroup
              value={props.renderMode}
              onValueChange={(value: string) =>
                props.onRenderModeChange(value as AssistantWorkbenchRenderMode)
              }
            >
              <DropdownMenuRadioItem value="sheet">
                {assistantMessages.renderer.displayModes.sheet}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dialog">
                {assistantMessages.renderer.displayModes.dialog}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="embedded">
                {assistantMessages.renderer.displayModes.embedded}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => props.onOpenChange(false)}>
              <X data-icon />
              {assistantMessages.renderer.closeAssistant}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }

  const threadControls =
    props.onCreateThread || (props.threads && props.threads.length > 0) ? (
      <TooltipProvider delay={0}>
        <div
          className="flex items-center gap-1"
          onPointerDownCapture={clearThreadControlTooltip}
        >
          {props.threads ? (
            <ThreadHistoryPopover
              threads={props.threads}
              activeThreadId={props.activeThreadId}
              currentRun={props.currentRun}
              onSelectThread={props.onSelectThread}
              tooltipOpen={activeThreadControlTooltip === 'history'}
              onTooltipOpenChange={(nextOpen: boolean) =>
                updateThreadControlTooltip('history', nextOpen)
              }
              onDismissTooltip={clearThreadControlTooltip}
            />
          ) : null}
          {props.onCreateThread ? (
            <Tooltip
              open={activeThreadControlTooltip === 'create'}
              onOpenChange={(nextOpen) =>
                updateThreadControlTooltip('create', nextOpen)
              }
            >
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={compactHeaderActionClassName}
                    aria-label={assistantMessages.renderer.createThread}
                    onClick={handleCreateThread}
                  />
                }
              >
                <MessageSquarePlus className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>
                {assistantMessages.renderer.createThread}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </TooltipProvider>
    ) : null

  const visiblePendingInteractions = React.useMemo(
    () => (props.pendingInteractions ?? []).filter(isVisiblePendingInteraction),
    [props.pendingInteractions],
  )
  const hasPendingInteractionCards = visiblePendingInteractions.length > 0
  const interactionLocked =
    !hasPendingInteractionCards &&
    (props.currentRun?.status === 'queued' ||
      props.currentRun?.status === 'running')
  const canCancelRun = interactionLocked

  const mergedHeaderActions =
    headerActions || props.additionalHeaderActions ? (
      <div className="flex h-7 shrink-0 items-center gap-1 self-center rounded-lg bg-white/50 px-1 py-0 text-black [&_svg]:!size-3.5 [&_svg]:!text-black">
        {threadControls}
        {props.additionalHeaderActions}
        {headerActions}
      </div>
    ) : (
      threadControls
    )

  const activeThreadSummary = props.activeThreadId
    ? props.threads
        ?.find((thread) => thread.threadId === props.activeThreadId)
        ?.summary.trim() || null
    : null

  const headerDescription = lockedEmbedded ? undefined : props.protocol ? (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full border-0 bg-white/16 px-2 py-0.5 text-[11px] font-medium text-white">
        <Bot className="size-3 text-white" />
        {assistantMessages.brand.ai}
      </span>
      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/80">
        {props.protocol.launchArea.area.title}
      </span>
      {activeThreadSummary ? (
        <span className="max-w-[240px] truncate text-[11px] text-muted-foreground">
          {activeThreadSummary}
        </span>
      ) : null}
    </div>
  ) : (
    props.description
  )

  const headerTitle = (
    <span className="inline-flex h-full items-center gap-2 text-lg leading-none">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="size-6 text-white"
      >
        <path
          fill="currentColor"
          d="M5.5 16A2.5 2.5 0 0 0 8 18.5v1A2.5 2.5 0 0 0 5.5 22h-1A2.5 2.5 0 0 0 2 19.5v-1A2.5 2.5 0 0 0 4.5 16h1Zm5.178-10.793c.325-1.368 2.319-1.37 2.644 0l.027.142.042.255a6.26 6.26 0 0 0 5.26 5.046c1.553.224 1.561 2.473 0 2.699a6.26 6.26 0 0 0-5.302 5.301c-.225 1.563-2.475 1.554-2.699 0a6.26 6.26 0 0 0-5.3-5.3c-1.56-.225-1.557-2.474 0-2.699l.255-.042a6.26 6.26 0 0 0 5.046-5.26l.028-.141ZM19.5 2A2.5 2.5 0 0 0 22 4.5v1A2.5 2.5 0 0 0 19.5 8h-1A2.5 2.5 0 0 0 16 5.5v-1A2.5 2.5 0 0 0 18.5 2h1Z"
        />
      </svg>
      {assistantMessages.brand.assistantName}
    </span>
  )

  const messageContent = showThreadLoadingState ? (
    <div className="flex min-h-[240px] flex-1 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-10 text-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {assistantMessages.renderer.loadingThreadTitle}
          </p>
          <p className="mt-1 text-xs">
            {assistantMessages.renderer.loadingThreadDescription}
          </p>
        </div>
      </div>
    </div>
  ) : (
    <>
      <AssistantAnchorChatMessageList
        messages={visibleMessages}
        loadingOlder={loadingOlderMessages}
        onPreviewAttachment={handlePreviewAttachment}
        runProgressStateByRunId={props.runProgressStateByRunId}
        onLoadRunProgress={props.onLoadRunProgress}
        viewportRef={messageViewportRef}
        renderRunProgressContent={props.renderRunProgressContent}
      />
      <ProgressFeed items={props.progressItems ?? []} />
    </>
  )

  const contextPromptStrip = (
    <ContextPromptStrip
      anchors={props.activeAnchors ?? []}
      suggestions={props.protocol?.launchArea.suggestions ?? []}
      density={hasConversationContent ? 'docked' : 'landing'}
      disabled={props.sending || canCancelRun}
      onClearAnchor={props.onClearAnchor}
      onSendSuggestion={props.onSendSuggestion}
    />
  )

  const interactionLayer = hasPendingInteractionCards ? (
    <AssistantInteractionCards
      interactions={visiblePendingInteractions}
      disabled={interactionLocked}
      onCancel={props.onCancelRun}
      onSubmit={props.onSubmitInteraction}
    />
  ) : null

  const composerNode = hasPendingInteractionCards ? (
    interactionLayer
  ) : (
    <div
      className={cn(
        'flex flex-col',
        hasConversationContent ? 'gap-2.5' : 'gap-3',
      )}
    >
      {contextPromptStrip}
      <AssistantAnchorChatComposer
        ref={composerRef}
        composerValue={props.composerValue}
        protocol={props.protocol}
        attachments={draftAttachments}
        variant={hasConversationContent ? 'docked' : 'landing'}
        canSend={canSend}
        canCancel={canCancelRun}
        onComposerChange={props.onComposerChange}
        onAppendAttachments={(files) => {
          void props.onAppendAttachments(files)
        }}
        onPreviewAttachment={handlePreviewAttachment}
        onRemoveAttachment={props.onRemoveAttachment}
        onClearAnchor={props.onClearAnchor}
        onCancel={() => props.onCancelRun?.()}
        onSend={props.onSend}
        sendButtonLabel={props.sendButtonLabel}
        hideAttachmentLimitHint={props.hideAttachmentLimitHint}
        showAnchorSummary={false}
      />
    </div>
  )

  const landingContent = (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 py-8">
      <div className="w-full max-w-[560px]">
        <div className="mb-7 text-center">
          <p className="text-[28px] font-semibold text-foreground">
            Cyacle Agent
          </p>
          <p className="mt-2 text-[13px] leading-5 text-foreground/70">
            {assistantMessages.renderer.landingSubtitle}
          </p>
        </div>

        {composerNode}
      </div>
    </div>
  )

  const conversationComposerClassName = hasConversationContent
    ? cn(
        'relative z-20 border-t-0 bg-transparent px-4 pb-4 shadow-none',
        hasPendingInteractionCards ? 'pt-3' : 'pt-3.5',
      )
    : cn(lockedEmbedded && 'border-t-0')

  const panelProps = {
    open: props.open,
    title: headerTitle,
    description: headerDescription,
    className:
      '!rounded-[14px] border-0 bg-[linear-gradient(90deg,#08233D_0%,#00738E_40%,#1CA25A_100%)]',
    headerClassName: cn(
      'h-[46px] items-center border-b-0 bg-transparent py-0 text-white [&_h2]:flex [&_h2]:h-full [&_h2]:items-center [&_h2]:text-white',
      props.renderMode === 'embedded' ? 'px-3' : 'px-4',
      lockedEmbedded && 'bg-transparent',
      props.headerClassName,
    ),
    bodyShellClassName:
      props.renderMode === 'embedded'
        ? 'mx-1 mb-1 overflow-hidden rounded-t-lg rounded-b-xl bg-card shadow-none'
        : hasConversationContent
          ? 'mx-0.5 mb-0.5 overflow-hidden rounded-t-lg rounded-b-xl bg-card shadow-none'
          : undefined,
    headerBadge: props.protocol ? (
      <></>
    ) : (
      <Badge
        variant="outline"
        className="h-6 shrink-0 gap-1 rounded-full border-0 bg-white/16 px-2 text-[11px] font-medium text-white"
      >
        <Bot className="size-3 text-white" />
        {assistantMessages.brand.ai}
      </Badge>
    ),
    headerActions: mergedHeaderActions,
    viewportContentClassName: hasConversationContent
      ? undefined
      : '-mx-4 flex min-h-full flex-col bg-card px-4',
    messagesClassName: hasConversationContent
      ? 'gap-5 pb-3'
      : 'min-h-0 flex-1 gap-0',
    hasMessages: hasConversationContent,
    canLoadMoreAbove: visibleMessageStartIndex > 0,
    loadingMoreAbove: loadingOlderMessages,
    viewportStateKey,
    messageViewportRef,
    messages: hasConversationContent ? messageContent : landingContent,
    empty: landingContent,
    onReachTop: handleReachTop,
    composerClassName: conversationComposerClassName,
    composer: hasConversationContent ? composerNode : undefined,
  }

  return (
    <>
      {props.renderMode === 'dialog' ? (
        <AssistantDialogRenderer
          {...panelProps}
          onOpenChange={props.onOpenChange}
          panelAriaLabel={
            props.panelAriaLabel ?? assistantMessages.brand.panelAriaLabel
          }
          panelDescription={
            props.panelDescription ??
            assistantMessages.brand.dialogPanelDescription
          }
          panelClassName={props.dialogPanelClassName ?? 'sm:!max-w-[1080px]'}
        />
      ) : props.renderMode === 'embedded' ? (
        <AssistantEmbeddedRenderer
          {...panelProps}
          className="h-full"
          contentClassName={panelProps.className}
        />
      ) : (
        <AssistantSheetRenderer
          {...panelProps}
          onOpenChange={props.onOpenChange}
          panelAriaLabel={
            props.panelAriaLabel ?? assistantMessages.brand.panelAriaLabel
          }
          panelDescription={
            props.panelDescription ??
            assistantMessages.brand.sheetPanelDescription
          }
          panelClassName={props.sheetPanelClassName ?? 'sm:max-w-[620px]'}
        />
      )}

      {previewItem ? (
        <DocumentPreviewDialog
          open
          item={previewItem}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setPreviewItem(null)
            }
          }}
        />
      ) : null}
    </>
  )
}
