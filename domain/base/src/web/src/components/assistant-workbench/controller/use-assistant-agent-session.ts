import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useOptionalI18n } from '#/components/assistant-workbench/i18n/index.ts'
import type { AppMessages } from '#/components/assistant-workbench/i18n/index.ts'

import type {
  AssistantWorkbenchThreadStrategy,
  AssistantAnchorDeclaration,
  AssistantLaunchArea,
  AssistantPendingInteraction,
  AssistantRunProgressGroup,
  AssistantRunProgressLoadState,
  AssistantRunState,
  AssistantStreamPacket,
  AssistantStreamProgressItem,
  AssistantThreadTag,
  AssistantThreadSummary,
  AssistantWorkbenchMessage,
  AssistantWorkbenchTarget,
} from '../model'
import type { AssistantDraftAttachment } from '../content'
import type { AssistantAgentRequestContext } from '../service'
import { getConfiguredDocumentDownloadUrl } from '../service/agent-service-runtime'
import { useAssistantAgentUserContext } from '../service/agent-runtime-context'
import {
  assistantAgentService,
  uploadAssistantDraftAttachment,
} from '../service'
import { createPrefixedAssistantId } from '../lib/id'

const STREAM_FLUSH_INTERVAL_MS = 50
type AssistantWorkbenchMessages = AppMessages['assistantWorkbench']

function buildOptimisticMessageId(prefix: string) {
  return createPrefixedAssistantId(prefix)
}

function resolveDefaultThreadId(threads: Array<AssistantThreadSummary>) {
  return threads[0]?.threadId ?? null
}

function normalizeThreadTagValue(value: string | null | undefined) {
  return value?.trim() || null
}

function normalizeThreadTags(tags: Array<AssistantThreadTag>) {
  return tags
    .flatMap((tag) => {
      const key = tag.key.trim()
      const value = normalizeThreadTagValue(tag.value)

      if (!key || !value) {
        return []
      }

      return [
        {
          key,
          value,
        },
      ]
    })
    .sort((left, right) => {
      if (left.key === right.key) {
        return left.value.localeCompare(right.value)
      }

      return left.key.localeCompare(right.key)
    })
}

function buildThreadScopeKey(tags: Array<AssistantThreadTag>) {
  if (tags.length === 0) {
    return 'no-tags'
  }

  return JSON.stringify(tags)
}

function buildRunProgressGroupsFingerprint(
  groups: Array<AssistantRunProgressGroup>,
) {
  return JSON.stringify(
    groups.map((group) => ({
      runId: group.runId,
      step: group.step,
      items: group.items.map((item) => ({
        id: item.id,
        data: item.data,
        itemIndex: item.itemIndex,
        createdAt: item.createdAt,
      })),
    })),
  )
}

function mergeAssistantAnchors(args: {
  launchArea: AssistantLaunchArea | null
  defaultAnchors: Array<AssistantAnchorDeclaration>
}) {
  const merged = [...(args.launchArea?.anchors ?? []), ...args.defaultAnchors]
  const visited = new Set<string>()

  return merged.flatMap((anchor) => {
    const dataId = anchor.dataId.trim()

    if (!dataId) {
      return []
    }

    const key = `${anchor.dataType}:${dataId}`

    if (visited.has(key)) {
      return []
    }

    visited.add(key)

    return [
      {
        ...anchor,
        dataId,
      },
    ]
  })
}

function buildAssistantMessageContent(args: {
  content: string
  launchArea: AssistantLaunchArea | null
  threadTags: Array<AssistantThreadTag>
}) {
  return args.content.trim()
}

function buildOptimisticUserMessage(args: {
  threadId: string
  anchorId?: string | null
  content: string
  attachments: Array<AssistantDraftAttachment>
  anchors: Array<AssistantAnchorDeclaration>
}) {
  return {
    id: buildOptimisticMessageId('assistant-user'),
    threadId: args.threadId,
    role: 'user',
    kind: 'message',
    content: args.content,
    createdAt: new Date().toISOString(),
    anchorId: args.anchorId,
    anchors: args.anchors,
    attachments: args.attachments
      .filter((attachment) => attachment.remoteFileId)
      .map((attachment) => ({
        id: attachment.remoteFileId ?? attachment.id,
        name: attachment.name,
        noteText: attachment.noteText,
        mimeType: attachment.mimeType,
        sizeText: attachment.sizeText,
        downloadUrl: attachment.remoteFileId
          ? getConfiguredDocumentDownloadUrl(attachment.remoteFileId)
          : undefined,
      })),
    status: 'completed',
  } satisfies AssistantWorkbenchMessage
}

function buildStreamingAssistantMessage(args: {
  threadId: string
  anchorId?: string | null
  runId?: string | null
  messages: AssistantWorkbenchMessages
}) {
  return {
    id: buildOptimisticMessageId('assistant-stream'),
    runId: args.runId?.trim() || undefined,
    threadId: args.threadId,
    role: 'assistant',
    kind: 'action',
    content: '',
    createdAt: new Date().toISOString(),
    anchorId: args.anchorId,
    thinking: {
      title: args.messages.message.thinkingProcess,
      content: '',
      rawContent: '',
      collapsed: false,
    },
    status: 'running',
  } satisfies AssistantWorkbenchMessage
}

function buildRunFailureMessage(args: {
  threadId: string
  runId?: string | null
  anchorId?: string | null
  title?: string | null
  content: string
  messages: AssistantWorkbenchMessages
}) {
  return {
    id: buildOptimisticMessageId('assistant-run-failure'),
    runId: normalizeRunId(args.runId) ?? undefined,
    threadId: args.threadId,
    role: 'system',
    kind: 'action',
    title: args.title?.trim() || args.messages.errors.runFailed,
    content: args.content,
    createdAt: new Date().toISOString(),
    anchorId: args.anchorId,
    status: 'failed',
  } satisfies AssistantWorkbenchMessage
}

function hasVisibleMessagePayload(message: AssistantWorkbenchMessage | null) {
  if (!message) {
    return false
  }

  return Boolean(
    message.title?.trim() ||
    message.content.trim() ||
    message.thinking?.content.trim(),
  )
}

function surfaceRunFailureMessage(args: {
  currentMessages: Array<AssistantWorkbenchMessage>
  assistantMessageId?: string | null
  threadId: string
  runId?: string | null
  anchorId?: string | null
  title?: string | null
  errorMessage: string
  messages: AssistantWorkbenchMessages
}) {
  const assistantMessageId = args.assistantMessageId?.trim() || null
  const targetMessage = assistantMessageId
    ? (args.currentMessages.find(
        (message) => message.id === assistantMessageId,
      ) ?? null)
    : null
  const targetMessageHasVisiblePayload = hasVisibleMessagePayload(targetMessage)

  const nextMessages = assistantMessageId
    ? updateLastMessage(
        args.currentMessages,
        assistantMessageId,
        (message) => ({
          ...message,
          content: message.content.trim() ? message.content : args.errorMessage,
          status: 'failed',
          thinking: message.thinking
            ? {
                ...message.thinking,
                collapsed: Boolean(message.content.trim()),
              }
            : message.thinking,
        }),
      )
    : args.currentMessages

  if (targetMessage && !targetMessageHasVisiblePayload) {
    return nextMessages
  }

  const normalizedRunId = normalizeRunId(args.runId)
  const lastMessage = nextMessages.at(-1)

  if (
    lastMessage?.role === 'system' &&
    lastMessage.status === 'failed' &&
    lastMessage.content.trim() === args.errorMessage &&
    lastMessage.threadId === args.threadId &&
    normalizeRunId(lastMessage.runId) === normalizedRunId
  ) {
    return nextMessages
  }

  const hasExistingRunBoundMessage = normalizedRunId
    ? nextMessages.some(
        (message) => normalizeRunId(message.runId) === normalizedRunId,
      )
    : false

  return [
    ...nextMessages,
    buildRunFailureMessage({
      threadId: args.threadId,
      runId: hasExistingRunBoundMessage ? null : normalizedRunId,
      anchorId: args.anchorId,
      title: args.title,
      content: args.errorMessage,
      messages: args.messages,
    }),
  ]
}

function upsertProgressItem(
  current: Array<AssistantStreamProgressItem>,
  nextItem: AssistantStreamProgressItem,
) {
  const existingIndex = current.findIndex((item) => item.id === nextItem.id)

  if (existingIndex < 0) {
    return [...current, nextItem]
  }

  return current.map((item, index) =>
    index === existingIndex ? { ...item, ...nextItem } : item,
  )
}

function updateLastMessage(
  current: Array<AssistantWorkbenchMessage>,
  messageId: string,
  updater: (message: AssistantWorkbenchMessage) => AssistantWorkbenchMessage,
) {
  return current.map((message) =>
    message.id === messageId ? updater(message) : message,
  )
}

function reconcileRefreshedMessages(args: {
  currentMessages: Array<AssistantWorkbenchMessage>
  freshMessages: Array<AssistantWorkbenchMessage>
  completedAssistantMessageId?: string | null
}) {
  const completedAssistantMessageId = args.completedAssistantMessageId?.trim()

  if (!completedAssistantMessageId) {
    return args.freshMessages
  }

  const currentCompletedAssistant = args.currentMessages.find(
    (message) =>
      message.id === completedAssistantMessageId &&
      message.role === 'assistant',
  )

  if (!currentCompletedAssistant) {
    return args.freshMessages
  }

  const hasPersistedCompletedAssistant = args.freshMessages.some(
    (message) => message.id === completedAssistantMessageId,
  )

  if (hasPersistedCompletedAssistant) {
    return args.freshMessages
  }

  return args.currentMessages
}

function isUnresolvedPendingInteraction(
  interaction: AssistantPendingInteraction,
) {
  return (
    interaction.status === 'PENDING' ||
    (interaction.status === 'UNSPECIFIED' && !interaction.respondedAt)
  )
}

function reconcileRefreshedPendingInteractions(args: {
  currentInteractions: Array<AssistantPendingInteraction>
  freshInteractions: Array<AssistantPendingInteraction>
  threadId: string | null
}) {
  if (args.currentInteractions.length === 0) {
    return args.freshInteractions
  }

  const freshInteractionIds = new Set(
    args.freshInteractions.map((interaction) => interaction.id),
  )
  const retainedLiveInteractions = args.currentInteractions.filter(
    (interaction) =>
      isUnresolvedPendingInteraction(interaction) &&
      interaction.threadId === args.threadId &&
      !freshInteractionIds.has(interaction.id),
  )

  if (retainedLiveInteractions.length === 0) {
    return args.freshInteractions
  }

  return [...args.freshInteractions, ...retainedLiveInteractions]
}

function normalizeInteractionSelectionMode(value: string | null | undefined) {
  return value === 'MULTIPLE' ? 'MULTIPLE' : 'SINGLE'
}

function isThreadMutationBlocked(
  status: AssistantRunState['status'] | undefined,
) {
  return status === 'queued' || status === 'running'
}

function resolveStreamingRunStatus(current: AssistantRunState) {
  return current.status === 'waiting_user' ? 'waiting_user' : 'running'
}

function normalizeRunDetailStatus(
  status: string | null | undefined,
): AssistantRunState['status'] {
  switch (status?.trim().toUpperCase()) {
    case 'QUEUED':
      return 'queued'
    case 'RUNNING':
      return 'running'
    case 'REQUIRE_ACTION':
      return 'waiting_user'
    case 'COMPLETED':
      return 'completed'
    case 'FAILED':
      return 'failed'
    case 'CANCELLED':
      return 'cancelled'
    default:
      return 'idle'
  }
}

function normalizeRunId(value: string | null | undefined) {
  const normalizedValue = value?.trim()

  return normalizedValue ? normalizedValue : null
}

function canResumeRunStream(status: AssistantRunState['status']) {
  return status === 'queued' || status === 'running'
}

function resolveResumeRunId(args: {
  preferredRunId?: string | null
  messages: Array<AssistantWorkbenchMessage>
}) {
  const preferredRunId = args.preferredRunId?.trim()

  if (preferredRunId) {
    return preferredRunId
  }

  for (let index = args.messages.length - 1; index >= 0; index -= 1) {
    const runId = args.messages[index]?.runId?.trim()

    if (runId) {
      return runId
    }
  }

  return null
}

function isAssistantStreamDebugEnabled() {
  return Boolean(
    (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV,
  )
}

export interface UseAssistantAgentSessionOptions {
  enabled?: boolean
  scopeId: string
  activeTarget: AssistantWorkbenchTarget | null
  launchArea?: AssistantLaunchArea | null
  threadStrategy?: AssistantWorkbenchThreadStrategy
  threadActivationId?: string | null
  resumeRunId?: string | null
  resolveDefaultAnchors?: () => Array<AssistantAnchorDeclaration>
  resolveThreadTags?: () => Array<AssistantThreadTag>
  operatorId?: string | null
  workspaceId?: string | null
  organizationId?: string | null
  defaultAttachmentOnlyPrompt?: string
  onMessageCompleted?: (
    target: AssistantWorkbenchTarget | null,
  ) => Promise<void> | void
  onRunProgressLoaded?: (args: {
    runId: string
    groups: Array<AssistantRunProgressGroup>
  }) => Promise<void> | void
}

export function useAssistantAgentSession(
  options: UseAssistantAgentSessionOptions,
) {
  const { language, messages: i18nMessages } = useOptionalI18n()
  const assistantMessages = i18nMessages.assistantWorkbench
  const queryClient = useQueryClient()
  const assistantUserContext = useAssistantAgentUserContext()
  const sessionEnabled = options.enabled !== false
  const [currentThreadId, setCurrentThreadId] = React.useState<string | null>(
    null,
  )
  const [messages, setMessagesState] = React.useState<
    Array<AssistantWorkbenchMessage>
  >([])
  const [progressItems, setProgressItems] = React.useState<
    Array<AssistantStreamProgressItem>
  >([])
  const [pendingInteractions, setPendingInteractions] = React.useState<
    Array<AssistantPendingInteraction>
  >([])
  const [runProgressStateByRunIdState, setRunProgressStateByRunIdState] =
    React.useState<Record<string, AssistantRunProgressLoadState>>({})
  const [currentRun, setCurrentRun] = React.useState<AssistantRunState | null>(
    null,
  )
  const [creatingThread, setCreatingThread] = React.useState(false)
  const [threadSelectionMode, setThreadSelectionMode] = React.useState<
    'default' | 'draft'
  >('default')
  const [liveSyncThreadId, setLiveSyncThreadId] = React.useState<string | null>(
    null,
  )
  const [uploadingAttachmentIds, setUploadingAttachmentIds] = React.useState<
    Array<string>
  >([])
  const messagesRef = React.useRef<Array<AssistantWorkbenchMessage>>([])
  const pendingInteractionsRef = React.useRef<
    Array<AssistantPendingInteraction>
  >([])
  const runProgressStateByRunIdRef = React.useRef<
    Record<string, AssistantRunProgressLoadState>
  >({})
  const runProgressRequestsRef = React.useRef<
    Map<string, Promise<Array<AssistantRunProgressGroup>>>
  >(new Map())
  const runProgressNotificationFingerprintByRunIdRef = React.useRef<
    Map<string, string>
  >(new Map())
  const lastStreamingMessageIdRef = React.useRef<string | null>(null)
  const resumeAnchorIdRef = React.useRef<string | null>(null)
  const activeTargetRef = React.useRef<AssistantWorkbenchTarget | null>(
    options.activeTarget,
  )
  const onMessageCompletedRef = React.useRef(options.onMessageCompleted)
  const onRunProgressLoadedRef = React.useRef(options.onRunProgressLoaded)
  const handledThreadActivationIdRef = React.useRef<string | null>(null)
  const handledThreadScopeKeyRef = React.useRef<string | null>(null)
  const handledResumeRunKeyRef = React.useRef<string | null>(null)
  const pendingContentChunkRef = React.useRef('')
  const pendingThinkingChunkRef = React.useRef('')
  const flushTimerRef = React.useRef<number | null>(null)
  const runAbortControllerRef = React.useRef<AbortController | null>(null)

  const setMessages = React.useCallback(
    (updater: React.SetStateAction<Array<AssistantWorkbenchMessage>>) => {
      const nextMessages =
        typeof updater === 'function' ? updater(messagesRef.current) : updater

      messagesRef.current = nextMessages
      setMessagesState(nextMessages)
    },
    [],
  )

  const setSyncedPendingInteractions = React.useCallback(
    (updater: React.SetStateAction<Array<AssistantPendingInteraction>>) => {
      const nextPendingInteractions =
        typeof updater === 'function'
          ? updater(pendingInteractionsRef.current)
          : updater

      pendingInteractionsRef.current = nextPendingInteractions
      setPendingInteractions(nextPendingInteractions)
    },
    [],
  )

  const setRunProgressStateByRunId = React.useCallback(
    (
      updater: React.SetStateAction<
        Record<string, AssistantRunProgressLoadState>
      >,
    ) => {
      const nextRunProgressState =
        typeof updater === 'function'
          ? updater(runProgressStateByRunIdRef.current)
          : updater

      runProgressStateByRunIdRef.current = nextRunProgressState
      setRunProgressStateByRunIdState(nextRunProgressState)
    },
    [],
  )

  const requestContext = React.useMemo(() => {
    if (!sessionEnabled) {
      return null
    }

    const operatorId =
      options.operatorId?.trim() || assistantUserContext.operatorId?.trim()

    if (!operatorId) {
      return null
    }

    return {
      operatorId,
      workspaceId: options.workspaceId ?? assistantUserContext.workspaceId,
      organizationId:
        options.organizationId ?? assistantUserContext.organizationId,
    } satisfies AssistantAgentRequestContext
  }, [
    assistantUserContext.operatorId,
    assistantUserContext.organizationId,
    assistantUserContext.workspaceId,
    sessionEnabled,
    options.organizationId,
    options.operatorId,
    options.workspaceId,
  ])

  const attachmentOrganizationId =
    options.organizationId ?? assistantUserContext.organizationId

  const notifyRunProgressLoaded = React.useCallback(
    async (runId: string, groups: Array<AssistantRunProgressGroup>) => {
      const callback = onRunProgressLoadedRef.current

      if (!callback) {
        return
      }

      const fingerprint = buildRunProgressGroupsFingerprint(groups)

      if (
        runProgressNotificationFingerprintByRunIdRef.current.get(runId) ===
        fingerprint
      ) {
        return
      }

      runProgressNotificationFingerprintByRunIdRef.current.set(
        runId,
        fingerprint,
      )
      await callback({
        runId,
        groups,
      })
    },
    [],
  )

  const loadRunProgress = React.useCallback(
    async (runId: string, args?: { force?: boolean }) => {
      const normalizedRunId = normalizeRunId(runId)

      if (!requestContext || !normalizedRunId) {
        return []
      }

      if (!args?.force) {
        const existingRequest =
          runProgressRequestsRef.current.get(normalizedRunId)

        if (existingRequest) {
          return existingRequest
        }

        const cachedState = runProgressStateByRunIdRef.current[
          normalizedRunId
        ] as AssistantRunProgressLoadState | undefined

        if (cachedState?.status === 'loaded') {
          return cachedState.groups
        }
      }

      setRunProgressStateByRunId((current) => ({
        ...current,
        [normalizedRunId]: {
          status: 'loading',
          groups:
            (
              current[normalizedRunId] as
                | AssistantRunProgressLoadState
                | undefined
            )?.groups ?? [],
          errorMessage: null,
        },
      }))

      const request = assistantAgentService
        .getRunProgress(requestContext, normalizedRunId)
        .then(async (groups) => {
          setRunProgressStateByRunId((current) => ({
            ...current,
            [normalizedRunId]: {
              status: 'loaded',
              groups,
              errorMessage: null,
            },
          }))

          if (args?.force) {
            await notifyRunProgressLoaded(normalizedRunId, groups)
          }

          return groups
        })
        .catch((error) => {
          setRunProgressStateByRunId((current) => ({
            ...current,
            [normalizedRunId]: {
              status: 'error',
              groups:
                (
                  current[normalizedRunId] as
                    | AssistantRunProgressLoadState
                    | undefined
                )?.groups ?? [],
              errorMessage:
                error instanceof Error
                  ? error.message
                  : assistantMessages.errors.runProgressLoadFailed,
            },
          }))

          throw error
        })
        .finally(() => {
          const currentRequest =
            runProgressRequestsRef.current.get(normalizedRunId)

          if (currentRequest === request) {
            runProgressRequestsRef.current.delete(normalizedRunId)
          }
        })

      runProgressRequestsRef.current.set(normalizedRunId, request)

      return request
    },
    [
      assistantMessages,
      notifyRunProgressLoaded,
      requestContext,
      setRunProgressStateByRunId,
    ],
  )

  const resolvedDefaultAnchors = React.useMemo(
    () => options.resolveDefaultAnchors?.() ?? [],
    [options.resolveDefaultAnchors],
  )
  const resolvedThreadTags = React.useMemo(
    () => normalizeThreadTags(options.resolveThreadTags?.() ?? []),
    [options.resolveThreadTags],
  )
  const threadScopeKey = React.useMemo(
    () => buildThreadScopeKey(resolvedThreadTags),
    [resolvedThreadTags],
  )

  const threadsQuery = useQuery({
    queryKey: [
      'assistant-workbench',
      'threads',
      options.scopeId,
      threadScopeKey,
    ],
    queryFn: () =>
      assistantAgentService.getThreads(requestContext!, resolvedThreadTags),
    enabled: Boolean(sessionEnabled && requestContext),
  })

  const defaultThreadId = React.useMemo(
    () => resolveDefaultThreadId(threadsQuery.data ?? []),
    [threadsQuery.data],
  )

  const messagesQuery = useQuery({
    queryKey: [
      'assistant-workbench',
      'messages',
      options.scopeId,
      currentThreadId,
    ],
    queryFn: () =>
      assistantAgentService.getMessages(requestContext!, currentThreadId!, {
        thinkingTitle: assistantMessages.message.thinkingProcess,
      }),
    enabled: Boolean(sessionEnabled && requestContext && currentThreadId),
  })

  const interactionsQuery = useQuery({
    queryKey: [
      'assistant-workbench',
      'pending-interactions',
      options.scopeId,
      currentThreadId,
    ],
    queryFn: () =>
      assistantAgentService.getPendingInteractions(
        requestContext!,
        currentThreadId!,
        {
          defaultTitle: assistantMessages.errors.interactionTitle,
        },
      ),
    enabled: Boolean(sessionEnabled && requestContext && currentThreadId),
  })

  React.useEffect(() => {
    if (!messagesQuery.data) {
      return
    }

    if (currentThreadId && liveSyncThreadId === currentThreadId) {
      return
    }

    setMessages(
      reconcileRefreshedMessages({
        currentMessages: messagesRef.current,
        freshMessages: messagesQuery.data,
        completedAssistantMessageId: lastStreamingMessageIdRef.current,
      }),
    )
  }, [currentThreadId, liveSyncThreadId, messagesQuery.data, setMessages])

  React.useEffect(() => {
    if (!interactionsQuery.data) {
      return
    }

    if (currentThreadId && liveSyncThreadId === currentThreadId) {
      return
    }

    setSyncedPendingInteractions((current) =>
      reconcileRefreshedPendingInteractions({
        currentInteractions: current,
        freshInteractions: interactionsQuery.data,
        threadId: currentThreadId,
      }),
    )
  }, [
    currentThreadId,
    interactionsQuery.data,
    liveSyncThreadId,
    setSyncedPendingInteractions,
  ])

  const currentThreadIsEmpty = React.useMemo(() => {
    if (!currentThreadId) {
      return true
    }

    if (messagesQuery.isFetching || interactionsQuery.isFetching) {
      return false
    }

    if (
      currentRun?.status === 'running' ||
      currentRun?.status === 'waiting_user' ||
      currentRun?.status === 'queued'
    ) {
      return false
    }

    return (
      messages.length === 0 &&
      pendingInteractions.length === 0 &&
      progressItems.length === 0
    )
  }, [
    currentRun?.status,
    currentThreadId,
    interactionsQuery.isFetching,
    messages.length,
    messagesQuery.isFetching,
    pendingInteractions.length,
    progressItems.length,
  ])

  const loadingThread = React.useMemo(() => {
    if (!currentThreadId || threadSelectionMode !== 'default') {
      return false
    }

    if (liveSyncThreadId === currentThreadId) {
      return false
    }

    if (
      messages.length > 0 ||
      pendingInteractions.length > 0 ||
      progressItems.length > 0 ||
      currentRun
    ) {
      return false
    }

    return messagesQuery.isFetching || interactionsQuery.isFetching
  }, [
    currentRun,
    currentThreadId,
    interactionsQuery.isFetching,
    liveSyncThreadId,
    messages.length,
    messagesQuery.isFetching,
    pendingInteractions.length,
    progressItems.length,
    threadSelectionMode,
  ])

  const resumeRunId = React.useMemo(
    () =>
      resolveResumeRunId({
        preferredRunId: options.resumeRunId,
        messages,
      }),
    [messages, options.resumeRunId],
  )

  const flushBufferedStreamingChunks = React.useCallback(() => {
    flushTimerRef.current = null

    const assistantMessageId = lastStreamingMessageIdRef.current

    if (!assistantMessageId) {
      pendingContentChunkRef.current = ''
      pendingThinkingChunkRef.current = ''
      return
    }

    const nextContentChunk = pendingContentChunkRef.current
    const nextThinkingChunk = pendingThinkingChunkRef.current

    pendingContentChunkRef.current = ''
    pendingThinkingChunkRef.current = ''

    if (!nextContentChunk && !nextThinkingChunk) {
      return
    }

    setMessages((current) =>
      updateLastMessage(current, assistantMessageId, (message) => {
        const nextContent = `${message.content}${nextContentChunk}`
        const nextThinkingRaw = `${message.thinking?.rawContent ?? message.thinking?.content ?? ''}${nextThinkingChunk}`

        return {
          ...message,
          content: nextContent,
          thinking:
            nextThinkingRaw || message.thinking
              ? {
                  title: assistantMessages.message.thinkingProcess,
                  content: nextThinkingRaw,
                  rawContent: nextThinkingRaw,
                  collapsed: Boolean(nextContent.trim()),
                }
              : undefined,
        }
      }),
    )
  }, [assistantMessages])

  const scheduleStreamingFlush = React.useCallback(() => {
    if (flushTimerRef.current !== null) {
      return
    }

    flushTimerRef.current = window.setTimeout(
      flushBufferedStreamingChunks,
      STREAM_FLUSH_INTERVAL_MS,
    )
  }, [flushBufferedStreamingChunks])

  const resetLiveRuntime = React.useCallback(() => {
    lastStreamingMessageIdRef.current = null
    pendingContentChunkRef.current = ''
    pendingThinkingChunkRef.current = ''

    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }

    runAbortControllerRef.current?.abort()
    runAbortControllerRef.current = null
  }, [])

  React.useEffect(() => {
    resumeAnchorIdRef.current =
      options.launchArea?.area.id ?? options.activeTarget?.id ?? null
  }, [options.activeTarget?.id, options.launchArea?.area.id])

  React.useEffect(() => {
    activeTargetRef.current = options.activeTarget
  }, [options.activeTarget])

  React.useEffect(() => {
    onMessageCompletedRef.current = options.onMessageCompleted
  }, [options.onMessageCompleted])

  React.useEffect(() => {
    onRunProgressLoadedRef.current = options.onRunProgressLoaded
  }, [options.onRunProgressLoaded])

  React.useEffect(() => {
    return () => {
      resetLiveRuntime()
    }
  }, [resetLiveRuntime])

  const resetThreadView = React.useCallback(() => {
    resetLiveRuntime()
    handledResumeRunKeyRef.current = null
    setLiveSyncThreadId(null)
    setMessages([])
    setSyncedPendingInteractions([])
    setProgressItems([])
    setCurrentRun(null)
  }, [resetLiveRuntime, setSyncedPendingInteractions])

  React.useEffect(() => {
    const nextHandledKey = `${options.scopeId}:${threadScopeKey}`

    if (handledThreadScopeKeyRef.current === nextHandledKey) {
      return
    }

    handledThreadScopeKeyRef.current = nextHandledKey
    handledThreadActivationIdRef.current = null
    handledResumeRunKeyRef.current = null
    runProgressRequestsRef.current.clear()
    setRunProgressStateByRunId({})
    setThreadSelectionMode('default')
    resetThreadView()
    setCurrentThreadId(null)
  }, [
    options.scopeId,
    resetThreadView,
    setRunProgressStateByRunId,
    threadScopeKey,
  ])

  React.useEffect(() => {
    if (
      creatingThread ||
      currentThreadId ||
      threadSelectionMode !== 'default' ||
      !threadsQuery.data
    ) {
      return
    }

    setCurrentThreadId(defaultThreadId)
  }, [
    creatingThread,
    currentThreadId,
    defaultThreadId,
    threadSelectionMode,
    threadsQuery.data,
  ])

  const activateDraftThread = React.useCallback(() => {
    setThreadSelectionMode('draft')

    if (
      !currentThreadId &&
      !currentRun &&
      messages.length === 0 &&
      pendingInteractions.length === 0 &&
      progressItems.length === 0
    ) {
      return
    }

    resetThreadView()
    setCurrentThreadId(null)
  }, [
    currentRun,
    currentThreadId,
    messages.length,
    pendingInteractions.length,
    progressItems.length,
    resetThreadView,
  ])

  const activateDefaultThread = React.useCallback(() => {
    setThreadSelectionMode('default')

    if (defaultThreadId === currentThreadId) {
      return
    }

    resetThreadView()
    setCurrentThreadId(defaultThreadId)
  }, [currentThreadId, defaultThreadId, resetThreadView])

  const startThreadDraft = React.useCallback(() => {
    if (creatingThread) {
      return
    }

    activateDraftThread()
  }, [activateDraftThread, creatingThread])

  const refreshCurrentThread = React.useCallback(async () => {
    if (!requestContext || !currentThreadId) {
      return
    }

    const [freshMessages, freshInteractions] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: [
          'assistant-workbench',
          'messages',
          options.scopeId,
          currentThreadId,
        ],
        queryFn: () =>
          assistantAgentService.getMessages(requestContext, currentThreadId, {
            thinkingTitle: assistantMessages.message.thinkingProcess,
          }),
        staleTime: 0,
      }),
      queryClient.fetchQuery({
        queryKey: [
          'assistant-workbench',
          'pending-interactions',
          options.scopeId,
          currentThreadId,
        ],
        queryFn: () =>
          assistantAgentService.getPendingInteractions(
            requestContext,
            currentThreadId,
            {
              defaultTitle: assistantMessages.errors.interactionTitle,
            },
          ),
        staleTime: 0,
      }),
    ])

    const nextMessages = reconcileRefreshedMessages({
      currentMessages: messagesRef.current,
      freshMessages,
      completedAssistantMessageId: lastStreamingMessageIdRef.current,
    })

    queryClient.setQueryData(
      ['assistant-workbench', 'messages', options.scopeId, currentThreadId],
      nextMessages,
    )
    setMessages(nextMessages)
    setSyncedPendingInteractions((current) =>
      reconcileRefreshedPendingInteractions({
        currentInteractions: current,
        freshInteractions,
        threadId: currentThreadId,
      }),
    )
    await queryClient.invalidateQueries({
      queryKey: [
        'assistant-workbench',
        'threads',
        options.scopeId,
        threadScopeKey,
      ],
    })
  }, [
    currentThreadId,
    options.scopeId,
    queryClient,
    requestContext,
    setSyncedPendingInteractions,
    threadScopeKey,
  ])

  const settleStreamingAssistantMessageAfterCancel = React.useCallback(() => {
    flushBufferedStreamingChunks()
    const assistantMessageId = lastStreamingMessageIdRef.current

    if (!assistantMessageId) {
      return
    }

    setMessages((current) => {
      const streamingMessage = current.find(
        (message) => message.id === assistantMessageId,
      )

      if (!streamingMessage) {
        return current
      }

      const hasVisibleContent = Boolean(
        streamingMessage.content.trim() ||
        streamingMessage.thinking?.content.trim(),
      )

      if (!hasVisibleContent) {
        return current.filter((message) => message.id !== assistantMessageId)
      }

      return updateLastMessage(current, assistantMessageId, (message) => ({
        ...message,
        status: 'completed',
        thinking: message.thinking
          ? {
              ...message.thinking,
              collapsed: Boolean(message.content.trim()),
            }
          : message.thinking,
      }))
    })

    setProgressItems([])
    lastStreamingMessageIdRef.current = null
  }, [flushBufferedStreamingChunks])

  const handleStreamSubscriptionFailure = React.useCallback(
    (args: {
      error: unknown
      threadId: string
      runId: string
      assistantMessageId?: string | null
    }) => {
      const errorMessage =
        args.error instanceof Error
          ? args.error.message
          : assistantMessages.errors.eventStreamFailed

      flushBufferedStreamingChunks()

      setMessages((current) =>
        surfaceRunFailureMessage({
          currentMessages: current,
          assistantMessageId: args.assistantMessageId,
          threadId: args.threadId,
          runId: args.runId,
          anchorId: resumeAnchorIdRef.current,
          title: assistantMessages.errors.runFailed,
          errorMessage,
          messages: assistantMessages,
        }),
      )

      setProgressItems((current) =>
        current.some(
          (item) => item.status === 'failed' || item.level === 'error',
        )
          ? current
          : [],
      )
      setLiveSyncThreadId((current) =>
        current === args.threadId ? null : current,
      )
      setCurrentRun((current) =>
        current && current.runId === args.runId
          ? {
              ...current,
              status: 'failed',
              errorMessage,
            }
          : current,
      )
    },
    [assistantMessages, flushBufferedStreamingChunks],
  )

  const handleStreamPacket = React.useCallback(
    async (packet: AssistantStreamPacket) => {
      if (
        isAssistantStreamDebugEnabled() &&
        (packet.type === 'custom' ||
          (packet.type === 'lifecycle' &&
            packet.name === 'message.completed') ||
          packet.type === 'done')
      ) {
        console.log(
          `[assistant stream] ${packet.type}:${packet.name} ${JSON.stringify({
            packet,
            activeTarget: activeTargetRef.current,
            lastStreamingMessageId: lastStreamingMessageIdRef.current,
          })}`,
        )
      }

      if (packet.type === 'content' && packet.name === 'assistant.delta') {
        const delta =
          typeof packet.data?.delta === 'string' ? packet.data.delta : ''

        if (delta) {
          pendingContentChunkRef.current += delta
          scheduleStreamingFlush()
        }

        setCurrentRun((current) =>
          current
            ? {
                ...current,
                status: resolveStreamingRunStatus(current),
                lastEventId: packet.id,
              }
            : current,
        )
        return
      }

      if (packet.type === 'thinking' && packet.name === 'assistant.reasoning') {
        const delta =
          typeof packet.data?.delta === 'string' ? packet.data.delta : ''

        if (delta) {
          pendingThinkingChunkRef.current += delta
          scheduleStreamingFlush()
        }

        setCurrentRun((current) =>
          current
            ? {
                ...current,
                status: resolveStreamingRunStatus(current),
                lastEventId: packet.id,
              }
            : current,
        )
        return
      }

      if (packet.type === 'progress') {
        const progressItem = {
          id: packet.id,
          type: packet.type,
          name: packet.name,
          status: packet.status,
          title:
            packet.display?.title ??
            packet.display?.progressLabel ??
            packet.name,
          message: packet.display?.message ?? null,
          level: packet.display?.level ?? null,
          createdAt: packet.ts ?? new Date().toISOString(),
        } satisfies AssistantStreamProgressItem

        setProgressItems((current) => upsertProgressItem(current, progressItem))
        setCurrentRun((current) =>
          current
            ? {
                ...current,
                status: resolveStreamingRunStatus(current),
                lastEventId: packet.id,
              }
            : current,
        )
        return
      }

      if (
        packet.type === 'interaction' &&
        packet.name === 'interaction.requested'
      ) {
        const nextInteraction = {
          id:
            typeof packet.data?.interactionId === 'string'
              ? packet.data.interactionId
              : packet.id,
          threadId: packet.threadId,
          runId: packet.runId,
          lastEventId: packet.id,
          kind:
            packet.data?.kind === 'CONFIRM' || packet.data?.kind === 'CHOICE'
              ? packet.data.kind
              : 'UNSPECIFIED',
          title:
            typeof packet.data?.title === 'string'
              ? packet.data.title
              : assistantMessages.errors.pendingInteraction,
          body: typeof packet.data?.body === 'string' ? packet.data.body : null,
          selectionMode: normalizeInteractionSelectionMode(
            typeof packet.data?.selectionMode === 'string'
              ? packet.data.selectionMode
              : null,
          ),
          options: Array.isArray(packet.data?.options)
            ? packet.data.options.flatMap((option) => {
                if (!option || typeof option !== 'object') {
                  return []
                }

                const record = option as Record<string, unknown>

                return typeof record.id === 'string' &&
                  typeof record.label === 'string'
                  ? [
                      {
                        id: record.id,
                        label: record.label,
                        description:
                          typeof record.description === 'string'
                            ? record.description
                            : null,
                        disabled:
                          typeof record.disabled === 'boolean'
                            ? record.disabled
                            : null,
                      },
                    ]
                  : []
              })
            : [],
          status: 'PENDING',
          createdAt: packet.ts ?? new Date().toISOString(),
          respondedAt: null,
        } satisfies AssistantPendingInteraction

        setSyncedPendingInteractions((current) => {
          const existingIndex = current.findIndex(
            (item) => item.id === nextInteraction.id,
          )

          if (existingIndex < 0) {
            return [...current, nextInteraction]
          }

          return current.map((item, index) =>
            index === existingIndex ? nextInteraction : item,
          )
        })
        setCurrentRun((current) =>
          current
            ? {
                ...current,
                status: 'waiting_user',
                lastEventId: packet.id,
              }
            : current,
        )
        return
      }

      if (
        packet.type === 'interaction' &&
        packet.name === 'interaction.resolved'
      ) {
        const interactionId =
          typeof packet.data?.interactionId === 'string'
            ? packet.data.interactionId
            : ''

        setSyncedPendingInteractions((current) =>
          current.map((interaction) =>
            interaction.id === interactionId
              ? {
                  ...interaction,
                  status: 'ANSWERED',
                  respondedAt:
                    typeof packet.data?.answeredAt === 'string'
                      ? packet.data.answeredAt
                      : new Date().toISOString(),
                }
              : interaction,
          ),
        )
        return
      }

      if (packet.type === 'lifecycle' && packet.name === 'run.started') {
        setCurrentRun((current) =>
          current
            ? { ...current, status: 'running', lastEventId: packet.id }
            : current,
        )
        return
      }

      if (packet.type === 'lifecycle' && packet.name === 'run.require_action') {
        setCurrentRun((current) =>
          current
            ? { ...current, status: 'waiting_user', lastEventId: packet.id }
            : current,
        )
        return
      }

      if (packet.type === 'lifecycle' && packet.name === 'run.resumed') {
        setCurrentRun((current) =>
          current
            ? { ...current, status: 'running', lastEventId: packet.id }
            : current,
        )
        return
      }

      if (packet.type === 'lifecycle' && packet.name === 'message.completed') {
        flushBufferedStreamingChunks()
        const assistantMessageId = lastStreamingMessageIdRef.current
        const completedAssistantMessageId =
          typeof packet.data?.messageId === 'string'
            ? packet.data.messageId.trim() || null
            : null

        if (assistantMessageId) {
          setMessages((current) =>
            updateLastMessage(current, assistantMessageId, (message) => ({
              ...message,
              id: completedAssistantMessageId ?? message.id,
              status: 'completed',
              thinking: message.thinking
                ? {
                    ...message.thinking,
                    collapsed: true,
                  }
                : message.thinking,
            })),
          )

          if (completedAssistantMessageId) {
            lastStreamingMessageIdRef.current = completedAssistantMessageId
          }
        }

        setCurrentRun((current) =>
          current
            ? { ...current, status: 'completed', lastEventId: packet.id }
            : current,
        )

        if (onMessageCompletedRef.current) {
          await onMessageCompletedRef.current(activeTargetRef.current)
        }
        return
      }

      if (packet.type === 'error') {
        flushBufferedStreamingChunks()
        const errorMessage =
          typeof packet.data?.message === 'string'
            ? packet.data.message
            : (packet.display?.message ??
              assistantMessages.errors.collaborationRequestFailed)

        setMessages((current) =>
          surfaceRunFailureMessage({
            currentMessages: current,
            assistantMessageId: lastStreamingMessageIdRef.current,
            threadId: packet.threadId,
            runId: packet.runId,
            anchorId: resumeAnchorIdRef.current,
            title: packet.display?.title ?? assistantMessages.errors.runFailed,
            errorMessage,
            messages: assistantMessages,
          }),
        )

        setCurrentRun((current) =>
          current
            ? {
                ...current,
                status: 'failed',
                errorMessage,
                lastEventId: packet.id,
                terminalEventReceived: true,
              }
            : current,
        )
        setLiveSyncThreadId((current) =>
          current === packet.threadId ? null : current,
        )
        return
      }

      if (packet.type === 'done') {
        flushBufferedStreamingChunks()
        const normalizedRunId = normalizeRunId(packet.runId)
        const runProgressPromise = normalizedRunId
          ? loadRunProgress(normalizedRunId, { force: true }).catch(
              () => undefined,
            )
          : Promise.resolve(undefined)
        await refreshCurrentThread()
        await runProgressPromise

        setProgressItems((current) =>
          current.some(
            (item) => item.status === 'failed' || item.level === 'error',
          )
            ? current
            : [],
        )
        setLiveSyncThreadId((current) =>
          current === packet.threadId ? null : current,
        )
        setCurrentRun((current) => {
          if (!current) {
            return current
          }

          if (current.status === 'waiting_user') {
            return current
          }

          if (current.status === 'failed' || current.status === 'cancelled') {
            return { ...current, terminalEventReceived: true }
          }

          return {
            ...current,
            status: 'completed',
            lastEventId: packet.id,
            terminalEventReceived: true,
          }
        })
      }
    },
    [
      assistantMessages,
      flushBufferedStreamingChunks,
      loadRunProgress,
      refreshCurrentThread,
      scheduleStreamingFlush,
      setSyncedPendingInteractions,
    ],
  )

  const startStreamSubscription = React.useCallback(
    async (args: {
      runId: string
      threadId: string
      lastEventId?: string | null
      assistantMessageId?: string | null
    }) => {
      if (!requestContext) {
        return
      }

      runAbortControllerRef.current?.abort()
      const abortController = new AbortController()
      runAbortControllerRef.current = abortController

      try {
        await assistantAgentService.subscribeToRun(requestContext, {
          runId: args.runId,
          lastEventId: args.lastEventId,
          signal: abortController.signal,
          eventStreamFailedMessage: assistantMessages.errors.eventStreamFailed,
          onPacket: (packet) => {
            void handleStreamPacket(packet)
          },
        })
      } catch (error) {
        handleStreamSubscriptionFailure({
          error,
          threadId: args.threadId,
          runId: args.runId,
          assistantMessageId: args.assistantMessageId,
        })
        throw error
      }
    },
    [
      assistantMessages,
      handleStreamPacket,
      handleStreamSubscriptionFailure,
      requestContext,
    ],
  )

  React.useEffect(() => {
    if (!requestContext || !currentThreadId) {
      return
    }

    if (!resumeRunId) {
      return
    }

    if (
      currentRun?.runId === resumeRunId ||
      liveSyncThreadId === currentThreadId
    ) {
      return
    }

    const resumeKey = `${options.scopeId}:${currentThreadId}:${resumeRunId}`

    if (handledResumeRunKeyRef.current === resumeKey) {
      return
    }

    handledResumeRunKeyRef.current = resumeKey

    const releaseResumeKey = () => {
      if (handledResumeRunKeyRef.current === resumeKey) {
        handledResumeRunKeyRef.current = null
      }
    }

    void (async () => {
      const runDetail = await assistantAgentService.getRun(
        requestContext,
        resumeRunId,
      )

      if (handledResumeRunKeyRef.current !== resumeKey) {
        releaseResumeKey()
        return
      }

      const runThreadId = runDetail.threadId.trim()

      if (!runThreadId || runThreadId !== currentThreadId) {
        releaseResumeKey()
        return
      }

      const nextRunStatus = normalizeRunDetailStatus(runDetail.status)

      if (nextRunStatus === 'idle') {
        return
      }

      if (
        canResumeRunStream(nextRunStatus) &&
        messagesRef.current.length === 0
      ) {
        await refreshCurrentThread()

        if (handledResumeRunKeyRef.current !== resumeKey) {
          releaseResumeKey()
          return
        }
      }

      setCurrentRun({
        runId: runDetail.id,
        threadId: runThreadId,
        messageId: runDetail.messageId || null,
        status: nextRunStatus,
        terminalEventReceived:
          nextRunStatus === 'completed' ||
          nextRunStatus === 'failed' ||
          nextRunStatus === 'cancelled',
      })

      if (!canResumeRunStream(nextRunStatus)) {
        return
      }

      let assistantMessageId = lastStreamingMessageIdRef.current

      if (!assistantMessageId) {
        const streamingAssistantMessage = buildStreamingAssistantMessage({
          threadId: runThreadId,
          anchorId: resumeAnchorIdRef.current,
          runId: runDetail.id,
          messages: assistantMessages,
        })

        assistantMessageId = streamingAssistantMessage.id
        lastStreamingMessageIdRef.current = assistantMessageId
        setMessages((current) => [...current, streamingAssistantMessage])
      }

      setLiveSyncThreadId(runThreadId)
      await startStreamSubscription({
        runId: runDetail.id,
        threadId: runThreadId,
        assistantMessageId,
      })
    })().catch(() => {
      releaseResumeKey()
    })

    return () => {
      releaseResumeKey()
    }
  }, [
    assistantMessages,
    currentRun?.runId,
    currentThreadId,
    liveSyncThreadId,
    resumeRunId,
    options.scopeId,
    requestContext,
    refreshCurrentThread,
    setMessages,
    startStreamSubscription,
  ])

  const createThread = React.useCallback(
    async (args?: { force?: boolean }) => {
      if (!requestContext || isThreadMutationBlocked(currentRun?.status)) {
        return null
      }

      if (!args?.force && currentThreadIsEmpty && currentThreadId) {
        return currentThreadId
      }

      setCreatingThread(true)

      const previousThreadId = currentThreadId
      const previousMessages = messages
      const previousPendingInteractions = pendingInteractions
      const previousProgressItems = progressItems
      const previousRun = currentRun
      const previousThreadSelectionMode = threadSelectionMode

      resetThreadView()
      setCurrentThreadId(null)

      try {
        const thread = await assistantAgentService.newThread(
          requestContext,
          resolvedThreadTags,
        )

        queryClient.setQueryData<Array<AssistantThreadSummary>>(
          ['assistant-workbench', 'threads', options.scopeId, threadScopeKey],
          (current) => (current ? [thread, ...current] : [thread]),
        )
        setThreadSelectionMode('default')
        setCurrentThreadId(thread.threadId)

        return thread.threadId
      } catch (error) {
        setThreadSelectionMode(previousThreadSelectionMode)
        setCurrentThreadId(previousThreadId)
        setMessages(previousMessages)
        setSyncedPendingInteractions(previousPendingInteractions)
        setProgressItems(previousProgressItems)
        setCurrentRun(previousRun)

        throw error
      } finally {
        setCreatingThread(false)
      }
    },
    [
      currentThreadId,
      currentThreadIsEmpty,
      currentRun?.status,
      currentRun,
      messages,
      options.scopeId,
      pendingInteractions,
      progressItems,
      queryClient,
      requestContext,
      resolvedThreadTags,
      resetThreadView,
      setSyncedPendingInteractions,
      threadScopeKey,
      threadSelectionMode,
    ],
  )

  React.useEffect(() => {
    if (!requestContext || !options.threadActivationId) {
      return
    }

    if (handledThreadActivationIdRef.current === options.threadActivationId) {
      return
    }

    if (creatingThread || isThreadMutationBlocked(currentRun?.status)) {
      return
    }

    handledThreadActivationIdRef.current = options.threadActivationId

    if (options.threadStrategy === 'new-thread') {
      activateDraftThread()
      return
    }

    if (threadSelectionMode === 'draft') {
      return
    }

    activateDefaultThread()
  }, [
    activateDefaultThread,
    activateDraftThread,
    creatingThread,
    currentRun?.status,
    options.threadActivationId,
    options.threadStrategy,
    requestContext,
    threadSelectionMode,
  ])

  const selectThread = React.useCallback(
    (threadId: string) => {
      if (!threadId || threadId === currentThreadId || creatingThread) {
        return
      }

      const cachedMessages =
        queryClient.getQueryData<Array<AssistantWorkbenchMessage>>([
          'assistant-workbench',
          'messages',
          options.scopeId,
          threadId,
        ]) ?? []
      const cachedInteractions =
        queryClient.getQueryData<Array<AssistantPendingInteraction>>([
          'assistant-workbench',
          'pending-interactions',
          options.scopeId,
          threadId,
        ]) ?? []

      resetThreadView()
      setThreadSelectionMode('default')
      setMessages(cachedMessages)
      setSyncedPendingInteractions(cachedInteractions)
      setCurrentThreadId(threadId)
    },
    [
      creatingThread,
      currentThreadId,
      options.scopeId,
      queryClient,
      resetThreadView,
      setSyncedPendingInteractions,
    ],
  )

  const uploadAttachments = React.useCallback(
    async (attachments: Array<AssistantDraftAttachment>) => {
      const nextPendingAttachments = attachments.filter(
        (attachment) =>
          !attachment.remoteFileId && attachment.uploadStatus !== 'failed',
      )

      if (nextPendingAttachments.length === 0) {
        return attachments
      }

      setUploadingAttachmentIds(
        nextPendingAttachments.map((attachment) => attachment.id),
      )

      const results = await Promise.allSettled(
        nextPendingAttachments.map(async (attachment) => ({
          localId: attachment.id,
          uploaded: await uploadAssistantDraftAttachment(attachment, {
            organizationId: attachmentOrganizationId,
            missingOrganizationMessage:
              assistantMessages.errors.missingOrganizationForUpload,
          }),
        })),
      )

      setUploadingAttachmentIds([])

      return attachments.map<AssistantDraftAttachment>((attachment) => {
        const matchingResult = results.find((result) =>
          result.status === 'fulfilled'
            ? result.value.localId === attachment.id
            : false,
        )

        if (matchingResult?.status === 'fulfilled') {
          return {
            ...attachment,
            remoteFileId:
              matchingResult.value.uploaded.documentId ??
              matchingResult.value.uploaded.id,
            uploadStatus: 'ready' as const,
            errorMessage: undefined,
          }
        }

        const failedResult = results.find((result, index) =>
          result.status === 'rejected'
            ? nextPendingAttachments[index]?.id === attachment.id
            : false,
        )

        if (failedResult?.status === 'rejected') {
          return {
            ...attachment,
            uploadStatus: 'failed' as const,
            errorMessage:
              failedResult.reason instanceof Error
                ? failedResult.reason.message
                : assistantMessages.errors.uploadFailed,
          }
        }

        return attachment
      })
    },
    [assistantMessages, attachmentOrganizationId],
  )

  const sendMessage = React.useCallback(
    async (args: {
      content: string
      attachments: Array<AssistantDraftAttachment>
      threadStrategy?: AssistantWorkbenchThreadStrategy
    }) => {
      if (!requestContext) {
        throw new Error(assistantMessages.errors.missingUserContext)
      }

      if (
        currentRun?.status === 'running' ||
        currentRun?.status === 'waiting_user'
      ) {
        throw new Error(assistantMessages.errors.activeRunInProgress)
      }

      const uploadedAttachments = await uploadAttachments(args.attachments)
      const failedAttachment = uploadedAttachments.find(
        (attachment) => attachment.uploadStatus === 'failed',
      )

      if (failedAttachment) {
        throw new Error(
          failedAttachment.errorMessage ||
            assistantMessages.attachments.validation.uploadFailed(
              failedAttachment.name,
            ),
        )
      }

      const readyAttachments = uploadedAttachments.filter(
        (attachment) => attachment.remoteFileId,
      )
      const normalizedContent =
        args.content.trim() ||
        (readyAttachments.length > 0
          ? (options.defaultAttachmentOnlyPrompt ??
            '请结合我上传的文件继续分析。')
          : '')

      if (!normalizedContent) {
        return {
          attachments: uploadedAttachments,
          threadId: currentThreadId,
          runId: currentRun?.runId ?? null,
          messageId: currentRun?.messageId ?? null,
        }
      }

      const threadId =
        args.threadStrategy === 'new-thread'
          ? await createThread({ force: true })
          : (currentThreadId ?? (await createThread()))

      if (!threadId) {
        throw new Error(assistantMessages.errors.newThreadCreateFailed)
      }

      const anchors = mergeAssistantAnchors({
        launchArea: options.launchArea ?? null,
        defaultAnchors: resolvedDefaultAnchors,
      })
      const messageContent = buildAssistantMessageContent({
        content: normalizedContent,
        launchArea: options.launchArea ?? null,
        threadTags: resolvedThreadTags,
      })
      const optimisticUserMessage = buildOptimisticUserMessage({
        threadId,
        anchorId:
          options.launchArea?.area.id ?? options.activeTarget?.id ?? null,
        content: messageContent,
        attachments: readyAttachments,
        anchors,
      })
      const streamingAssistantMessage = buildStreamingAssistantMessage({
        threadId,
        anchorId:
          options.launchArea?.area.id ?? options.activeTarget?.id ?? null,
        messages: assistantMessages,
      })

      setLiveSyncThreadId(threadId)
      lastStreamingMessageIdRef.current = streamingAssistantMessage.id
      setMessages((current) => [
        ...current,
        optimisticUserMessage,
        streamingAssistantMessage,
      ])
      setProgressItems([])
      setCurrentRun({
        runId: '',
        threadId,
        status: 'queued',
      })

      try {
        const response = await assistantAgentService.sendMessage(
          requestContext,
          {
            threadId,
            content: messageContent,
            documentIds: readyAttachments.flatMap((attachment) =>
              attachment.remoteFileId ? [attachment.remoteFileId] : [],
            ),
            anchors,
            threadTags: resolvedThreadTags,
            lang: language,
          },
        )

        setCurrentRun({
          runId: response.runId,
          threadId,
          messageId: response.messageId,
          status: 'running',
        })
        setMessages((current) =>
          updateLastMessage(
            current,
            streamingAssistantMessage.id,
            (message) => ({
              ...message,
              runId: response.runId,
            }),
          ),
        )

        void startStreamSubscription({
          runId: response.runId,
          threadId,
          assistantMessageId: streamingAssistantMessage.id,
        }).catch(() => undefined)

        return {
          attachments: uploadedAttachments,
          threadId,
          runId: response.runId,
          messageId: response.messageId,
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : assistantMessages.errors.messageSendFailed

        setMessages((current) =>
          updateLastMessage(
            current,
            streamingAssistantMessage.id,
            (message) => ({
              ...message,
              content: errorMessage,
              status: 'failed',
            }),
          ),
        )
        setCurrentRun({
          runId: '',
          threadId,
          status: 'failed',
          errorMessage,
        })
        setLiveSyncThreadId((current) =>
          current === threadId ? null : current,
        )
        throw error
      }
    },
    [
      assistantMessages,
      createThread,
      currentRun?.status,
      currentThreadId,
      language,
      options.activeTarget,
      options.defaultAttachmentOnlyPrompt,
      options.launchArea,
      requestContext,
      resolvedDefaultAnchors,
      resolvedThreadTags,
      startStreamSubscription,
      uploadAttachments,
    ],
  )

  const submitInteraction = React.useCallback(
    async (args: {
      interactionId: string
      selectedOptionIds: Array<string>
    }) => {
      if (!requestContext) {
        return
      }

      const targetInteraction = pendingInteractions.find(
        (interaction) => interaction.id === args.interactionId,
      )
      const threadId = targetInteraction?.threadId ?? currentThreadId ?? null
      const runId = targetInteraction?.runId ?? currentRun?.runId ?? null

      if (!threadId || !runId) {
        throw new Error(assistantMessages.errors.interactionContextLost)
      }

      const response = await assistantAgentService.submitInteraction(
        requestContext,
        {
          threadId,
          runId,
          interactionId: args.interactionId,
          selectedOptionIds: args.selectedOptionIds,
        },
      )

      const lastEventId =
        typeof response.lastEventId === 'string' ? response.lastEventId : null

      setSyncedPendingInteractions((current) =>
        current.filter((interaction) => interaction.id !== args.interactionId),
      )

      setCurrentRun((current) =>
        current && current.runId === runId
          ? {
              ...current,
              status: 'running',
              lastEventId,
            }
          : {
              runId,
              threadId,
              status: 'running',
              lastEventId,
            },
      )

      setLiveSyncThreadId(threadId)
      void startStreamSubscription({
        runId,
        threadId,
        lastEventId,
      }).catch(() => undefined)
    },
    [
      assistantMessages,
      currentThreadId,
      currentRun?.runId,
      pendingInteractions,
      requestContext,
      setSyncedPendingInteractions,
      startStreamSubscription,
    ],
  )

  const cancelRun = React.useCallback(async () => {
    const pendingInteractionRun = pendingInteractions.find(
      (interaction) =>
        (interaction.status === 'PENDING' ||
          (interaction.status === 'UNSPECIFIED' && !interaction.respondedAt)) &&
        interaction.runId,
    )
    const cancellingRunId = currentRun?.runId ?? pendingInteractionRun?.runId

    if (!requestContext || !cancellingRunId) {
      return
    }

    const cancellingThreadId =
      currentRun?.threadId ?? pendingInteractionRun?.threadId ?? currentThreadId
    const retainedPendingInteractions = pendingInteractions.filter(
      (interaction) => interaction.runId !== cancellingRunId,
    )
    const cancelledPendingInteractions = pendingInteractions.filter(
      (interaction) => interaction.runId === cancellingRunId,
    )

    setSyncedPendingInteractions(retainedPendingInteractions)
    runAbortControllerRef.current?.abort()
    runAbortControllerRef.current = null

    try {
      await assistantAgentService.cancelRun(requestContext, cancellingRunId)
    } catch (error) {
      if (cancelledPendingInteractions.length > 0) {
        setSyncedPendingInteractions((current) => {
          const existingIds = new Set(
            current.map((interaction) => interaction.id),
          )

          return [
            ...current,
            ...cancelledPendingInteractions.filter(
              (interaction) => !existingIds.has(interaction.id),
            ),
          ]
        })
      }

      throw error
    }

    settleStreamingAssistantMessageAfterCancel()
    await refreshCurrentThread()
    setLiveSyncThreadId((current) =>
      current === cancellingThreadId ? null : current,
    )
    setCurrentRun((current) =>
      current && current.runId === cancellingRunId
        ? {
            ...current,
            status: 'cancelled',
            terminalEventReceived: true,
          }
        : current,
    )
  }, [
    currentThreadId,
    currentRun?.runId,
    currentRun?.threadId,
    pendingInteractions,
    refreshCurrentThread,
    requestContext,
    setSyncedPendingInteractions,
    settleStreamingAssistantMessageAfterCancel,
  ])

  const isBusy =
    creatingThread ||
    currentRun?.status === 'queued' ||
    currentRun?.status === 'running' ||
    currentRun?.status === 'waiting_user'

  const canSwitchThreads = !creatingThread
  const activeThread = threadsQuery.data?.find(
    (thread) => thread.threadId === currentThreadId,
  )

  return {
    threads: threadsQuery.data ?? [],
    activeThread,
    currentThreadId,
    messages,
    progressItems,
    runProgressStateByRunId: runProgressStateByRunIdState,
    pendingInteractions,
    currentRun,
    uploadingAttachmentIds,
    loading:
      threadsQuery.isLoading ||
      messagesQuery.isLoading ||
      interactionsQuery.isLoading ||
      creatingThread,
    isBusy,
    canSwitchThreads,
    currentThreadIsEmpty,
    loadingThread,
    startThreadDraft,
    createThread,
    selectThread,
    refreshCurrentThread,
    loadRunProgress,
    uploadAttachments,
    sendMessage,
    cancelRun,
    submitInteraction,
  }
}
