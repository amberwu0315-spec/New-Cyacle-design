'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, ChevronDown, ChevronRight, Clock3 } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible.tsx'
import { useOptionalI18n } from '#/components/assistant-workbench/i18n/index.ts'
import { cn } from '#/lib/utils.ts'
import type {
  AssistantRunProgressLoadState,
  AssistantWorkbenchMessage,
} from '../../model'
import {
  AssistantAnchorChatAttachmentList,
  normalizeAssistantMessageAttachment,
} from './attachment-list'
import type { AssistantAnchorChatAttachmentItem } from './attachment-list'
import { summarizeAssistantRunProgress } from './run-progress-echo'

function hasVisibleText(value: string | null | undefined) {
  return Boolean(value?.trim())
}

function getRenderableToolCalls(record: AssistantWorkbenchMessage) {
  return (record.toolCalls ?? []).filter(
    (toolCall) =>
      hasVisibleText(toolCall.name) || hasVisibleText(toolCall.input),
  )
}

function getRenderableToolResults(record: AssistantWorkbenchMessage) {
  return (record.toolResults ?? []).filter(
    (toolResult) =>
      hasVisibleText(toolResult.name) || hasVisibleText(toolResult.output),
  )
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function formatToolDetail(value: string) {
  const normalizedValue = value.trim()
  const parsedValue = tryParseJson(normalizedValue)

  if (parsedValue === null) {
    return normalizedValue
  }

  return JSON.stringify(parsedValue, null, 2)
}

function shouldRenderMessage(
  record: AssistantWorkbenchMessage,
  runProgressEchoMessageIds?: Set<string>,
) {
  if (record.status === 'running') {
    return true
  }

  const shouldAttachRunProgressEcho =
    record.role !== 'user' &&
    Boolean(record.runId?.trim()) &&
    (!runProgressEchoMessageIds || runProgressEchoMessageIds.has(record.id))

  return Boolean(
    hasVisibleText(record.title) ||
    hasVisibleText(record.content) ||
    hasVisibleText(record.thinking?.content) ||
    (record.attachments?.length ?? 0) > 0 ||
    getRenderableToolCalls(record).length > 0 ||
    getRenderableToolResults(record).length > 0 ||
    shouldAttachRunProgressEcho,
  )
}

function resolveRunProgressEchoMessageIds(
  messages: Array<AssistantWorkbenchMessage>,
) {
  const messageIds = new Set<string>()
  const visitedRunIds = new Set<string>()

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    const runId = message.runId?.trim()

    if (message.role === 'user' || !runId) {
      continue
    }

    if (visitedRunIds.has(runId)) {
      continue
    }

    visitedRunIds.add(runId)
    messageIds.add(message.id)
  }

  return messageIds
}

const CHAT_MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => (
    <p className="my-1 whitespace-pre-wrap first:mt-0 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  h1: ({ children }) => (
    <h3 className="mt-3 mb-1 text-sm font-semibold first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-3 mb-1 text-sm font-semibold first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1 text-sm font-semibold first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-2.5 mb-1 text-xs font-semibold first:mt-0">{children}</h4>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 ml-4 list-disc space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 ml-4 list-decimal space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-primary/30 pl-2 text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-muted p-2 text-[11px]">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-2 max-w-full overflow-x-auto rounded-md border bg-background/70">
      <table className="w-full min-w-max border-collapse text-[11px] leading-4">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/55">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b px-2 py-1.5 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t px-2 py-1.5 align-top">{children}</td>
  ),
}

function normalizeChatMarkdown(markdown: string) {
  return markdown.replace(/\r\n?/g, '\n').trim()
}

function splitStreamingMarkdown(markdown: string) {
  const normalizedMarkdown = normalizeChatMarkdown(markdown)
  const blockBoundaryIndex = normalizedMarkdown.lastIndexOf('\n\n')

  if (blockBoundaryIndex < 0) {
    return {
      stableMarkdown: '',
      liveText: normalizedMarkdown,
    }
  }

  return {
    stableMarkdown: normalizedMarkdown.slice(0, blockBoundaryIndex).trim(),
    liveText: normalizedMarkdown.slice(blockBoundaryIndex).trim(),
  }
}

function formatStreamingLiveText(markdown: string) {
  return markdown
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

const MemoizedReactMarkdown = React.memo(function AssistantMarkdownRenderer({
  markdown,
}: {
  markdown: string
}) {
  if (!markdown) {
    return null
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={CHAT_MARKDOWN_COMPONENTS}
    >
      {markdown}
    </ReactMarkdown>
  )
})

function StreamingMarkdownContent({ markdown }: { markdown: string }) {
  const { stableMarkdown, liveText } = React.useMemo(
    () => splitStreamingMarkdown(markdown),
    [markdown],
  )
  const liveDisplayText = React.useMemo(
    () => formatStreamingLiveText(liveText),
    [liveText],
  )

  return (
    <>
      <MemoizedReactMarkdown markdown={stableMarkdown} />
      {liveDisplayText ? (
        <p className="my-1 whitespace-pre-wrap break-words first:mt-0 last:mb-0">
          {liveDisplayText}
        </p>
      ) : null}
    </>
  )
}

export function ChatMarkdownContent(props: {
  markdown: string
  className?: string
  tone?: 'default' | 'muted' | 'inverted'
  streaming?: boolean
}) {
  const normalizedMarkdown = React.useMemo(
    () => normalizeChatMarkdown(props.markdown),
    [props.markdown],
  )

  return (
    <div
      className={cn(
        'min-w-0 text-xs leading-5 [&_a]:underline [&_a]:underline-offset-2',
        props.tone === 'muted' && 'text-muted-foreground',
        props.tone === 'default' && 'text-foreground',
        props.tone === 'inverted' &&
          'text-primary-foreground [&_blockquote]:text-primary-foreground/80 [&_code]:bg-primary-foreground/15 [&_table]:bg-primary-foreground/5',
        props.className,
      )}
    >
      {props.streaming ? (
        <StreamingMarkdownContent markdown={normalizedMarkdown} />
      ) : (
        <MemoizedReactMarkdown markdown={normalizedMarkdown} />
      )}
    </div>
  )
}

interface RunProgressContentRenderArgs {
  runId: string
  groups: AssistantRunProgressLoadState['groups']
  defaultContent: React.ReactNode
}

function formatRecordTime(value: string, language: string) {
  return new Date(value).toLocaleTimeString(language, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MessageTimestampBadge(props: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-10 -translate-y-[calc(80%)] text-[10px] font-medium whitespace-nowrap text-muted-foreground opacity-0 transition-opacity duration-150 ease-out group-hover/message:opacity-100 group-focus-within/message:opacity-100"
    >
      {props.label}
    </div>
  )
}

function ThinkingBlock(props: {
  thinking: NonNullable<AssistantWorkbenchMessage['thinking']>
  pending?: boolean
}) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const [open, setOpen] = React.useState(
    () => !props.pending && !props.thinking.collapsed,
  )
  const hasThinkingContent = Boolean(props.thinking.content.trim())
  const thinkingTitle = props.pending
    ? assistantMessages.message.thinkingInProgress
    : (props.thinking.title ?? assistantMessages.message.thinkingProcess)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-1.5 border-0 bg-transparent px-0 py-1 text-left text-[11px] leading-5 text-muted-foreground/90 shadow-none transition-colors hover:bg-transparent hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
          />
        }
      >
        <span className="truncate font-medium text-muted-foreground">
          {thinkingTitle}
        </span>
        {open ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      {hasThinkingContent ? (
        <CollapsibleContent className="overflow-hidden">
          <div className="py-0.5">
            <ChatMarkdownContent
              markdown={props.thinking.content}
              tone="muted"
              className="text-[11px] leading-5"
            />
          </div>
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  )
}

function buildToolActivitySummary(props: {
  toolCallsCount: number
  toolResultsCount: number
  names: Array<string>
  messages: ReturnType<typeof useOptionalI18n>['messages']['assistantWorkbench']
}) {
  const namePreview = props.names
    .filter((name) => name.trim())
    .slice(0, 2)
    .join('、')

  const countParts = [
    props.toolCallsCount > 0
      ? props.messages.message.toolCallCount(props.toolCallsCount)
      : null,
    props.toolResultsCount > 0
      ? props.messages.message.toolResultCount(props.toolResultsCount)
      : null,
  ].filter(Boolean)

  return [namePreview, countParts.join(' · ')].filter(Boolean).join(' · ')
}

function ToolActivityEntry(props: {
  entry: {
    id?: string | null
    kind: 'call' | 'result'
    name: string
    detail?: string | null
  }
}) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const hasDetail = hasVisibleText(props.entry.detail)
  const [open, setOpen] = React.useState(false)
  const detail = hasDetail ? formatToolDetail(props.entry.detail ?? '') : ''
  const badgeLabel =
    props.entry.kind === 'call'
      ? assistantMessages.message.toolCall
      : assistantMessages.message.toolResult

  if (!hasDetail) {
    return (
      <div className="rounded-md px-0 py-1">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex shrink-0 rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
            {badgeLabel}
          </span>
          <p className="min-w-0 truncate text-xs font-medium text-foreground/90">
            {props.entry.name}
          </p>
        </div>
      </div>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full items-start gap-2 border-0 bg-transparent px-0 py-1 text-left text-[11px] leading-5 text-muted-foreground/90 shadow-none transition-colors hover:bg-transparent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
          />
        }
      >
        <span className="mt-0.5 inline-flex shrink-0 rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
          {badgeLabel}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-xs font-medium text-foreground/90">
              {props.entry.name}
            </p>
            {open ? (
              <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden">
        <div className="pt-1 pl-8">
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 font-mono text-[11px] leading-4 text-foreground">
            {detail}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function MessageToolSummaries(props: {
  record: AssistantWorkbenchMessage
  className?: string
}) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const toolCalls = getRenderableToolCalls(props.record)
  const toolResults = getRenderableToolResults(props.record)
  const [open, setOpen] = React.useState(false)

  if (toolCalls.length === 0 && toolResults.length === 0) {
    return null
  }

  const entries = [
    ...toolCalls.map((toolCall) => ({
      id: toolCall.id,
      kind: 'call' as const,
      name: toolCall.name,
      detail: toolCall.input,
    })),
    ...toolResults.map((toolResult) => ({
      id: toolResult.id,
      kind: 'result' as const,
      name: toolResult.name,
      detail: toolResult.output,
    })),
  ]
  const summary = buildToolActivitySummary({
    toolCallsCount: toolCalls.length,
    toolResultsCount: toolResults.length,
    names: entries.map((entry) => entry.name),
    messages: assistantMessages,
  })

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn('mt-2', props.className)}
    >
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-1.5 border-0 bg-transparent px-0 py-1 text-left text-[11px] leading-5 text-muted-foreground/90 shadow-none transition-colors hover:bg-transparent hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
          />
        }
      >
        <span className="inline-flex shrink-0 items-center gap-1">
          <span className="truncate font-medium text-muted-foreground">
            {assistantMessages.message.toolActivity}
          </span>
          {open ? (
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
          )}
        </span>
        {summary ? (
          <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground/75">
            {summary}
          </span>
        ) : null}
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden">
        <div className="space-y-1 border-l border-border/60 py-1 pl-3">
          {entries.map((entry, index) => (
            <ToolActivityEntry
              key={entry.id ?? `${entry.kind}-${entry.name}-${index}`}
              entry={entry}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function MessageRunProgressEcho(props: {
  runId?: string
  runProgressState?: AssistantRunProgressLoadState
  onLoadRunProgress?: (runId: string) => Promise<unknown>
  viewportRef?: React.RefObject<HTMLDivElement | null>
  renderRunProgressContent?: (
    args: RunProgressContentRenderArgs,
  ) => React.ReactNode
}) {
  const { language, messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = React.useState(false)
  const runId = props.runId?.trim() || ''

  React.useEffect(() => {
    if (!runId || props.runProgressState || !props.onLoadRunProgress) {
      return
    }

    const target = sentinelRef.current

    if (!(target instanceof HTMLDivElement)) {
      return
    }

    if (typeof IntersectionObserver !== 'function') {
      void props.onLoadRunProgress(runId).catch(() => undefined)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return
        }

        observer.disconnect()
        void props.onLoadRunProgress?.(runId).catch(() => undefined)
      },
      {
        root: props.viewportRef?.current ?? null,
        rootMargin: '160px 0px',
      },
    )

    observer.observe(target)

    return () => {
      observer.disconnect()
    }
  }, [
    props.onLoadRunProgress,
    props.runProgressState,
    props.viewportRef,
    runId,
  ])

  if (props.runProgressState?.status !== 'loaded') {
    return <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />
  }

  const echoSummary = summarizeAssistantRunProgress(
    props.runProgressState.groups,
    {
      language,
      messages: assistantMessages,
    },
  )

  if (!echoSummary) {
    if (!runId || !props.renderRunProgressContent) {
      return null
    }

    const customContent = props.renderRunProgressContent({
      runId,
      groups: props.runProgressState.groups,
      defaultContent: null,
    })

    return customContent ? <>{customContent}</> : null
  }

  const defaultContent = (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-1.5 border-0 bg-transparent px-0 py-1 text-left text-[11px] leading-5 text-muted-foreground/90 shadow-none transition-colors hover:bg-transparent hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
          />
        }
      >
        <span className="truncate font-medium text-muted-foreground">
          {assistantMessages.message.runEcho}
        </span>
        <span className="min-w-0 truncate text-muted-foreground/75">
          {echoSummary.summary}
        </span>
        {open ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden">
        <div className="space-y-2 border-l border-border/60 py-1 pl-3">
          {echoSummary.sections.map((section) => (
            <div
              key={section.id}
              className="rounded-md border border-border/60 bg-muted/15 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-foreground">
                  {section.title}
                </p>
                <Badge
                  variant="outline"
                  className="h-5 rounded-full px-2 text-[10px]"
                >
                  {section.metric}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                {section.description}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )

  const customContent =
    runId && props.renderRunProgressContent
      ? props.renderRunProgressContent({
          runId,
          groups: props.runProgressState.groups,
          defaultContent,
        })
      : null

  if (customContent) {
    return <>{customContent}</>
  }

  return defaultContent
}

function AssistantMessageBubble(props: {
  record: AssistantWorkbenchMessage
  onPreviewAttachment?: (attachment: AssistantAnchorChatAttachmentItem) => void
  runProgressStateByRunId?: Record<string, AssistantRunProgressLoadState>
  onLoadRunProgress?: (runId: string) => Promise<unknown>
  showRunProgressEcho?: boolean
  viewportRef?: React.RefObject<HTMLDivElement | null>
  renderRunProgressContent?: (
    args: RunProgressContentRenderArgs,
  ) => React.ReactNode
}) {
  const { language, messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const messageAttachments = (props.record.attachments ?? []).map(
    normalizeAssistantMessageAttachment,
  )
  const runProgressState = props.record.runId?.trim()
    ? props.runProgressStateByRunId?.[props.record.runId.trim()]
    : undefined
  const content = props.record.content.trim()
  const thinkingPending = props.record.status === 'running' && !content
  const thinking =
    props.record.thinking?.content.trim() || thinkingPending
      ? (props.record.thinking ?? {
          title: assistantMessages.message.thinkingProcess,
          content: '',
          collapsed: false,
        })
      : null
  const runProgressEcho =
    props.record.role === 'user' || !props.showRunProgressEcho ? null : (
      <MessageRunProgressEcho
        runId={props.record.runId}
        runProgressState={runProgressState}
        onLoadRunProgress={props.onLoadRunProgress}
        viewportRef={props.viewportRef}
        renderRunProgressContent={props.renderRunProgressContent}
      />
    )
  const hasSystemChrome = Boolean(
    props.record.title?.trim() ||
    content ||
    thinking ||
    messageAttachments.length > 0,
  )
  const hasToolActivity = Boolean(
    getRenderableToolCalls(props.record).length > 0 ||
    getRenderableToolResults(props.record).length > 0,
  )
  const hasPrimaryPayload = Boolean(hasSystemChrome || hasToolActivity)

  if (!hasPrimaryPayload) {
    return runProgressEcho
  }

  if (props.record.role === 'system') {
    return (
      <div
        className={cn(
          hasSystemChrome && 'rounded-lg border bg-muted/35 px-3 py-2',
        )}
      >
        {props.record.title ? (
          <div className="flex items-center gap-1.5">
            <Bot className="size-3 text-primary" />
            <p className="text-xs font-medium text-foreground">
              {props.record.title}
            </p>
          </div>
        ) : null}
        {thinking ? (
          <ThinkingBlock thinking={thinking} pending={thinkingPending} />
        ) : null}
        {content ? (
          <ChatMarkdownContent
            markdown={content}
            tone="muted"
            className="mt-2"
            streaming={props.record.status === 'running'}
          />
        ) : null}
        <MessageToolSummaries
          record={props.record}
          className={hasSystemChrome ? undefined : 'mt-0'}
        />
        {runProgressEcho}
        {messageAttachments.length > 0 ? (
          <div className="mt-2">
            <AssistantAnchorChatAttachmentList
              attachments={messageAttachments}
              onPreview={props.onPreviewAttachment}
            />
          </div>
        ) : null}
      </div>
    )
  }

  if (props.record.role === 'agent' && props.record.kind === 'action') {
    return (
      <div className="rounded-lg border bg-card px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bot className="size-3" />
          <span className="font-medium text-foreground">
            {props.record.title ?? assistantMessages.message.agentExecution}
          </span>
          {props.record.status === 'running' ? (
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock3 className="size-3" />
              {assistantMessages.message.running}
            </Badge>
          ) : null}
        </div>
        {thinking ? (
          <ThinkingBlock thinking={thinking} pending={thinkingPending} />
        ) : null}
        {content ? (
          <ChatMarkdownContent
            markdown={content}
            tone="muted"
            className="mt-2"
            streaming={props.record.status === 'running'}
          />
        ) : null}
        <MessageToolSummaries record={props.record} />
        {runProgressEcho}
        {messageAttachments.length > 0 ? (
          <div className="mt-2">
            <AssistantAnchorChatAttachmentList
              attachments={messageAttachments}
              onPreview={props.onPreviewAttachment}
            />
          </div>
        ) : null}
      </div>
    )
  }

  const isUser = props.record.role === 'user'
  const formattedTime = formatRecordTime(props.record.createdAt, language)

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'group/message relative text-xs leading-5',
          isUser
            ? 'max-w-[85%] rounded-[16px] bg-primary px-3 py-2.5 text-primary-foreground shadow-sm transition-shadow duration-150 hover:shadow-md'
            : 'w-full max-w-none rounded-none border-0 bg-transparent px-0 py-0 text-foreground shadow-none',
        )}
      >
        <MessageTimestampBadge label={formattedTime} />
        {!isUser && thinking ? (
          <ThinkingBlock thinking={thinking} pending={thinkingPending} />
        ) : null}
        <ChatMarkdownContent
          markdown={props.record.content}
          tone={isUser ? 'inverted' : 'default'}
          streaming={props.record.status === 'running'}
          className={isUser ? 'text-[13px]' : undefined}
        />
        {!isUser ? <MessageToolSummaries record={props.record} /> : null}
        {!isUser ? runProgressEcho : null}
        {messageAttachments.length > 0 ? (
          <div className="mt-2">
            <AssistantAnchorChatAttachmentList
              attachments={messageAttachments}
              tone={isUser ? 'inverted' : 'default'}
              onPreview={props.onPreviewAttachment}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

const MemoizedAssistantMessageBubble = React.memo(
  AssistantMessageBubble,
  (prevProps, nextProps) =>
    prevProps.record === nextProps.record &&
    prevProps.onPreviewAttachment === nextProps.onPreviewAttachment &&
    prevProps.runProgressStateByRunId === nextProps.runProgressStateByRunId &&
    prevProps.onLoadRunProgress === nextProps.onLoadRunProgress &&
    prevProps.showRunProgressEcho === nextProps.showRunProgressEcho &&
    prevProps.viewportRef === nextProps.viewportRef &&
    prevProps.renderRunProgressContent === nextProps.renderRunProgressContent,
)

const MemoizedMessageChunk = React.memo(
  function AssistantMessageChunk(props: {
    messages: Array<AssistantWorkbenchMessage>
    onPreviewAttachment?: (
      attachment: AssistantAnchorChatAttachmentItem,
    ) => void
    runProgressStateByRunId?: Record<string, AssistantRunProgressLoadState>
    onLoadRunProgress?: (runId: string) => Promise<unknown>
    runProgressEchoMessageIds: Set<string>
    viewportRef?: React.RefObject<HTMLDivElement | null>
    renderRunProgressContent?: (
      args: RunProgressContentRenderArgs,
    ) => React.ReactNode
  }) {
    return props.messages.map((record) => (
      <MemoizedAssistantMessageBubble
        key={record.id}
        record={record}
        onPreviewAttachment={props.onPreviewAttachment}
        runProgressStateByRunId={props.runProgressStateByRunId}
        onLoadRunProgress={props.onLoadRunProgress}
        showRunProgressEcho={props.runProgressEchoMessageIds.has(record.id)}
        viewportRef={props.viewportRef}
        renderRunProgressContent={props.renderRunProgressContent}
      />
    ))
  },
  (prevProps, nextProps) => {
    if (
      prevProps.onPreviewAttachment !== nextProps.onPreviewAttachment ||
      prevProps.runProgressStateByRunId !== nextProps.runProgressStateByRunId ||
      prevProps.onLoadRunProgress !== nextProps.onLoadRunProgress ||
      prevProps.runProgressEchoMessageIds !==
        nextProps.runProgressEchoMessageIds ||
      prevProps.viewportRef !== nextProps.viewportRef ||
      prevProps.renderRunProgressContent !==
        nextProps.renderRunProgressContent ||
      prevProps.messages.length !== nextProps.messages.length
    ) {
      return false
    }

    return prevProps.messages.every(
      (message, index) => message === nextProps.messages[index],
    )
  },
)

export function AssistantAnchorChatMessageList(props: {
  messages: Array<AssistantWorkbenchMessage>
  onPreviewAttachment?: (attachment: AssistantAnchorChatAttachmentItem) => void
  loadingOlder?: boolean
  runProgressStateByRunId?: Record<string, AssistantRunProgressLoadState>
  onLoadRunProgress?: (runId: string) => Promise<unknown>
  viewportRef?: React.RefObject<HTMLDivElement | null>
  renderRunProgressContent?: (
    args: RunProgressContentRenderArgs,
  ) => React.ReactNode
}) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const runProgressEchoMessageIds = React.useMemo(
    () => resolveRunProgressEchoMessageIds(props.messages),
    [props.messages],
  )
  const visibleMessages = React.useMemo(
    () =>
      props.messages.filter((message) =>
        shouldRenderMessage(message, runProgressEchoMessageIds),
      ),
    [props.messages, runProgressEchoMessageIds],
  )

  const liveMessage = React.useMemo(() => {
    const lastMessage = visibleMessages.at(-1)

    return lastMessage?.status === 'running' ? lastMessage : null
  }, [visibleMessages])

  const historicalMessages = React.useMemo(
    () => (liveMessage ? visibleMessages.slice(0, -1) : visibleMessages),
    [liveMessage, visibleMessages],
  )

  return (
    <>
      {props.loadingOlder ? (
        <div className="flex items-center justify-center py-1 text-[11px] text-muted-foreground">
          {assistantMessages.message.loadingOlder}
        </div>
      ) : null}
      <MemoizedMessageChunk
        messages={historicalMessages}
        onPreviewAttachment={props.onPreviewAttachment}
        runProgressStateByRunId={props.runProgressStateByRunId}
        onLoadRunProgress={props.onLoadRunProgress}
        runProgressEchoMessageIds={runProgressEchoMessageIds}
        viewportRef={props.viewportRef}
        renderRunProgressContent={props.renderRunProgressContent}
      />
      {liveMessage ? (
        <MemoizedAssistantMessageBubble
          record={liveMessage}
          onPreviewAttachment={props.onPreviewAttachment}
          runProgressStateByRunId={props.runProgressStateByRunId}
          onLoadRunProgress={props.onLoadRunProgress}
          showRunProgressEcho={runProgressEchoMessageIds.has(liveMessage.id)}
          viewportRef={props.viewportRef}
          renderRunProgressContent={props.renderRunProgressContent}
        />
      ) : null}
    </>
  )
}
