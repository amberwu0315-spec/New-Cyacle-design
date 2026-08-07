import type {
  AgentMessage,
  AgentMessageResponse,
  AgentOrgInfo,
  AppLanguage,
  DocumentByIdEntry,
} from './agent-service-runtime'
import {
  AgentServiceClient as AgentService,
  Lang,
  buildConfiguredAgentEventUrl,
  getConfiguredAgentEventHeaders,
  getConfiguredDocumentDownloadUrl,
  getConfiguredDocumentInfoByIds,
} from './agent-service-runtime'

import type {
  AssistantPendingInteraction,
  AssistantRunProgressGroup,
  AssistantStreamPacket,
  AssistantThreadSummary,
  AssistantWorkbenchMessage,
  AssistantAnchorDeclaration,
  AssistantThreadTag,
} from '../model'
import {
  getAssistantWorkbenchMessages,
  getCurrentLanguage,
} from '../i18n/index.ts'

const agentService = new AgentService()

function getAssistantMessages() {
  return getAssistantWorkbenchMessages(getCurrentLanguage()).assistantWorkbench
}

function buildOperatorHeader(operatorId: string) {
  return btoa(JSON.stringify({ id: Number(operatorId) }))
}

function buildAgentServiceUrl(path: string) {
  return buildConfiguredAgentEventUrl(path)
}

function buildAgentRequestMetas(context: AssistantAgentRequestContext) {
  assertOperatorId(context.operatorId)

  return {
    headers: {
      'vrpc-operator': buildOperatorHeader(context.operatorId),
    },
  }
}

async function parseJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
) {
  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    payload = undefined
  }

  if (!response.ok) {
    const errorMessage =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string' &&
      payload.error.trim()
        ? payload.error
        : fallbackMessage

    throw new Error(errorMessage)
  }

  return payload as T
}

function isAbortLikeError(error: unknown, signal?: AbortSignal) {
  if (signal?.aborted) {
    return true
  }

  return error instanceof Error && error.name === 'AbortError'
}

function toNullableString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function resolveAttachmentMimeType(fileName: string) {
  const extension = fileName.trim().split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'pdf':
      return 'application/pdf'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'doc':
      return 'application/msword'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'xls':
      return 'application/vnd.ms-excel'
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'csv':
      return 'text/csv'
    case 'ppt':
      return 'application/vnd.ms-powerpoint'
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    case 'txt':
      return 'text/plain'
    case 'zip':
      return 'application/zip'
    default:
      return 'application/octet-stream'
  }
}

function normalizeMessageDocumentAttachment(
  documentId: string,
  index: number,
  documentInfo?: DocumentByIdEntry,
) {
  const fallbackName =
    getAssistantMessages().attachments.validation.fallbackAttachmentName(index)
  const name = documentInfo?.name.trim() || fallbackName

  return {
    id: documentId,
    name,
    mimeType: resolveAttachmentMimeType(name),
    downloadUrl: getConfiguredDocumentDownloadUrl(documentId),
  }
}

function resolveMessageDocumentIds(message: Record<string, unknown>) {
  if (Array.isArray(message.documentIds)) {
    return message.documentIds
  }

  if (Array.isArray(message.fileIds)) {
    return message.fileIds
  }

  return null
}

function collectMessageDocumentIds(messages: Array<Record<string, unknown>>) {
  return Array.from(
    new Set(
      messages.flatMap((message) =>
        (resolveMessageDocumentIds(message) ?? []).flatMap((documentId) =>
          typeof documentId === 'string' && documentId.trim()
            ? [documentId.trim()]
            : [],
        ),
      ),
    ),
  )
}

async function resolveMessageDocumentInfoMap(
  messages: Array<Record<string, unknown>>,
) {
  const documentIds = collectMessageDocumentIds(messages)

  if (documentIds.length === 0) {
    return new Map<string, DocumentByIdEntry>()
  }

  try {
    const entries = await getConfiguredDocumentInfoByIds(documentIds)

    return new Map(entries.map((entry) => [entry.id, entry] as const))
  } catch {
    return new Map<string, DocumentByIdEntry>()
  }
}

function normalizeMessage(
  message: Record<string, unknown>,
  options?: {
    thinkingTitle?: string
    documentInfoById?: Map<string, DocumentByIdEntry>
  },
): AssistantWorkbenchMessage {
  const roleValue =
    typeof message.role === 'string' ? message.role : 'assistant'
  const normalizedRole =
    roleValue === 'tool'
      ? 'system'
      : roleValue === 'assistant' ||
          roleValue === 'user' ||
          roleValue === 'system'
        ? roleValue
        : 'assistant'

  const thinkingValue = toNullableString(message.thinking)
  const contentValue =
    typeof message.content === 'string' ? message.content : ''

  return {
    id:
      (typeof message.messageId === 'string' && message.messageId) ||
      `message-${Math.random().toString(36).slice(2, 10)}`,
    runId: typeof message.runId === 'string' ? message.runId : undefined,
    threadId:
      typeof message.threadId === 'string' ? message.threadId : undefined,
    role: normalizedRole === 'assistant' ? 'assistant' : normalizedRole,
    kind:
      normalizedRole === 'assistant' || normalizedRole === 'system'
        ? 'action'
        : 'message',
    title: undefined,
    content: contentValue,
    thinking: thinkingValue
      ? {
          title: options?.thinkingTitle ?? getAssistantMessages().message.thinkingProcess,
          content: thinkingValue,
          rawContent: thinkingValue,
          collapsed: Boolean(contentValue.trim()),
        }
      : undefined,
    createdAt:
      message.createdAt == null
        ? new Date().toISOString()
        : normalizeDateTime(message.createdAt),
    attachments: resolveMessageDocumentIds(message)?.flatMap(
      (documentId, index) =>
        typeof documentId === 'string'
          ? [
              normalizeMessageDocumentAttachment(
                documentId,
                index,
                options?.documentInfoById?.get(documentId),
              ),
            ]
          : [],
    ),
    anchors: Array.isArray(message.anchors)
      ? (message.anchors as Array<AssistantAnchorDeclaration>)
      : undefined,
    toolCalls: Array.isArray(message.toolCalls)
      ? message.toolCalls.flatMap((toolCall) => {
          if (!toolCall || typeof toolCall !== 'object') {
            return []
          }

          const record = toolCall as Record<string, unknown>

          return typeof record.name === 'string'
            ? [
                {
                  id: toNullableString(record.id),
                  name: record.name,
                  input: toNullableString(record.input),
                },
              ]
            : []
        })
      : undefined,
    toolResults: Array.isArray(message.toolResults)
      ? message.toolResults.flatMap((toolResult) => {
          if (!toolResult || typeof toolResult !== 'object') {
            return []
          }

          const record = toolResult as Record<string, unknown>

          return typeof record.name === 'string'
            ? [
                {
                  id: toNullableString(record.id),
                  name: record.name,
                  output: toNullableString(record.output),
                },
              ]
            : []
        })
      : undefined,
    resolvedAnchorsSummary:
      message.resolvedAnchorsSummary &&
      typeof message.resolvedAnchorsSummary === 'object'
        ? (message.resolvedAnchorsSummary as AssistantWorkbenchMessage['resolvedAnchorsSummary'])
        : null,
    status: 'completed',
  }
}

function hasVisibleNormalizedMessagePayload(
  message: AssistantWorkbenchMessage,
) {
  return Boolean(
    message.title?.trim() ||
    message.content.trim() ||
    message.thinking?.content.trim() ||
    (message.attachments?.length ?? 0) > 0,
  )
}

function hasToolSummaries(message: AssistantWorkbenchMessage) {
  return Boolean(
    (message.toolCalls?.length ?? 0) > 0 ||
    (message.toolResults?.length ?? 0) > 0,
  )
}

function isToolSummaryOnlyMessage(message: AssistantWorkbenchMessage) {
  return (
    message.role !== 'user' &&
    hasToolSummaries(message) &&
    !hasVisibleNormalizedMessagePayload(message)
  )
}

function buildToolSummaryKey(summary: {
  id?: string | null
  name: string
  input?: string | null
  output?: string | null
}) {
  return [
    summary.id?.trim() ?? '',
    summary.name.trim(),
    summary.input?.trim() ?? '',
    summary.output?.trim() ?? '',
  ].join('\u0000')
}

function mergeToolSummaries<
  T extends {
    id?: string | null
    name: string
    input?: string | null
    output?: string | null
  },
>(current: Array<T> | undefined, incoming: Array<T> | undefined) {
  const merged: Array<T> = []
  const visited = new Set<string>()
  const items = [...(current ?? []), ...(incoming ?? [])]

  items.forEach((item) => {
    const key = buildToolSummaryKey(item)

    if (visited.has(key)) {
      return
    }

    visited.add(key)
    merged.push(item)
  })

  return merged
}

function mergeRunToolSummaryMessages(
  messages: Array<AssistantWorkbenchMessage>,
) {
  const toolSummariesByRunId = new Map<
    string,
    {
      toolCalls: NonNullable<AssistantWorkbenchMessage['toolCalls']>
      toolResults: NonNullable<AssistantWorkbenchMessage['toolResults']>
    }
  >()

  messages.forEach((message) => {
    const runId = message.runId?.trim()

    if (!runId || message.role === 'user' || !hasToolSummaries(message)) {
      return
    }

    const current = toolSummariesByRunId.get(runId) ?? {
      toolCalls: [],
      toolResults: [],
    }

    toolSummariesByRunId.set(runId, {
      toolCalls: mergeToolSummaries(current.toolCalls, message.toolCalls),
      toolResults: mergeToolSummaries(current.toolResults, message.toolResults),
    })
  })

  if (toolSummariesByRunId.size === 0) {
    return messages
  }

  const targetMessageIdByRunId = new Map<string, string>()
  const reversedMessages = [...messages].reverse()

  toolSummariesByRunId.forEach((_summaries, runId) => {
    const target =
      reversedMessages.find(
        (message) =>
          message.runId?.trim() === runId &&
          message.role === 'assistant' &&
          !isToolSummaryOnlyMessage(message),
      ) ??
      reversedMessages.find(
        (message) =>
          message.runId?.trim() === runId && message.role === 'assistant',
      ) ??
      reversedMessages.find(
        (message) =>
          message.runId?.trim() === runId &&
          message.role !== 'user' &&
          !isToolSummaryOnlyMessage(message),
      ) ??
      reversedMessages.find(
        (message) => message.runId?.trim() === runId && message.role !== 'user',
      )

    if (target) {
      targetMessageIdByRunId.set(runId, target.id)
    }
  })

  return messages.flatMap((message) => {
    const runId = message.runId?.trim()
    const targetMessageId = runId ? targetMessageIdByRunId.get(runId) : null

    if (
      runId &&
      targetMessageId &&
      message.id !== targetMessageId &&
      isToolSummaryOnlyMessage(message)
    ) {
      return []
    }

    if (!runId || message.id !== targetMessageId) {
      return [message]
    }

    const summaries = toolSummariesByRunId.get(runId)

    if (!summaries) {
      return [message]
    }

    return [
      {
        ...message,
        toolCalls: mergeToolSummaries(message.toolCalls, summaries.toolCalls),
        toolResults: mergeToolSummaries(
          message.toolResults,
          summaries.toolResults,
        ),
      },
    ]
  })
}

export interface AssistantAgentRequestContext {
  operatorId: string
  workspaceId?: string | null
  organizationId?: string | null
}

export interface AssistantSendMessageInput {
  threadId?: string | null
  content: string
  documentIds?: Array<string>
  anchors?: Array<AssistantAnchorDeclaration>
  threadTags?: Array<AssistantThreadTag>
  lang?: AppLanguage | null
}

export interface AssistantRunDetail {
  id: string
  messageId: string
  threadId: string
  status: string
  createdAt: string
  updatedAt: string
  completedAt?: string | null
}

function normalizeDateTime(value: unknown) {
  if (typeof value === 'string' && value) {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString()
  }

  return new Date().toISOString()
}

function normalizeInteger(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value)

    if (Number.isFinite(parsedValue)) {
      return parsedValue
    }
  }

  return 0
}

function assertOperatorId(
  operatorId: string | null | undefined,
): asserts operatorId is string {
  if (!operatorId || !/^\d+$/.test(operatorId)) {
    throw new Error(getAssistantMessages().errors.missingUserForInit)
  }
}

function buildOrgInfo(
  context: AssistantAgentRequestContext,
): AgentOrgInfo | null {
  const workspaceId = context.workspaceId?.trim() || null
  const organizationId = context.organizationId?.trim() || null

  if (!workspaceId && !organizationId) {
    return null
  }

  return {
    workspaceId,
    organizationId,
  }
}

function resolveAgentLang(language?: AppLanguage | null) {
  return language === 'en-US' ? Lang.LangEn : Lang.LangZh
}

function buildSendMessagePayload(input: AssistantSendMessageInput) {
  const attachmentIds = input.documentIds?.length
    ? input.documentIds
    : undefined

  return {
    threadId: input.threadId || undefined,
    content: input.content,
    documentIds: attachmentIds,
    fileIds: attachmentIds,
    anchors: input.anchors?.length ? input.anchors : undefined,
  } as AgentMessage
}

function normalizeInteractionKind(
  value: unknown,
): AssistantPendingInteraction['kind'] {
  const normalizedValue = String(value)

  return normalizedValue === 'CONFIRM' || normalizedValue === 'CHOICE'
    ? normalizedValue
    : 'UNSPECIFIED'
}

function normalizeInteractionSelectionMode(
  value: unknown,
): AssistantPendingInteraction['selectionMode'] {
  const normalizedValue = String(value)

  return normalizedValue === 'SINGLE' || normalizedValue === 'MULTIPLE'
    ? normalizedValue
    : 'UNSPECIFIED'
}

function normalizeInteractionStatus(
  value: unknown,
): AssistantPendingInteraction['status'] {
  const normalizedValue = String(value).trim().toUpperCase()

  return normalizedValue === 'PENDING' ||
    normalizedValue === 'ANSWERED' ||
    normalizedValue === 'CANCELLED' ||
    normalizedValue === 'EXPIRED'
    ? normalizedValue
    : 'UNSPECIFIED'
}

function normalizeNullableDateTime(value: unknown) {
  if (value == null) {
    return null
  }

  return normalizeDateTime(value)
}

function findBoundary(buffer: string) {
  const boundaryIndex = buffer.search(/\r\n\r\n|\n\n/)

  if (boundaryIndex < 0) {
    return null
  }

  const boundary = buffer.startsWith('\r\n\r\n', boundaryIndex)
    ? '\r\n\r\n'
    : buffer.slice(boundaryIndex, boundaryIndex + 2) === '\n\n'
      ? '\n\n'
      : buffer.slice(boundaryIndex, boundaryIndex + 4)

  return {
    index: boundaryIndex,
    length: boundary.length,
  }
}

function parseSseEvent(rawEvent: string) {
  const lines = rawEvent.split(/\r?\n/)
  let id = ''
  let event = ''
  const data: string[] = []

  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue
    }

    const separatorIndex = line.indexOf(':')
    const field = separatorIndex >= 0 ? line.slice(0, separatorIndex) : line
    const value =
      separatorIndex >= 0 ? line.slice(separatorIndex + 1).trimStart() : ''

    if (field === 'id') {
      id = value
      continue
    }

    if (field === 'event') {
      event = value
      continue
    }

    if (field === 'data') {
      data.push(value)
    }
  }

  return {
    id,
    event,
    data: data.join('\n'),
  }
}

export const assistantAgentService = {
  async getThreads(
    context: AssistantAgentRequestContext,
    tags?: Array<AssistantThreadTag>,
  ): Promise<Array<AssistantThreadSummary>> {
    const metas = buildAgentRequestMetas(context)

    const payload = await agentService.getThreads(
      tags?.length ? tags : null,
      metas,
    )

    return payload.map((item) => ({
      threadId: typeof item?.threadId === 'string' ? item.threadId : '',
      createdAt: normalizeDateTime(item?.createdAt),
      summary: typeof item?.summary === 'string' ? item.summary : '',
    })) satisfies Array<AssistantThreadSummary>
  },

  async newThread(
    context: AssistantAgentRequestContext,
    tags?: Array<AssistantThreadTag>,
  ): Promise<AssistantThreadSummary> {
    const metas = buildAgentRequestMetas(context)

    const payload = await agentService.newThread(
      tags?.length ? tags : null,
      metas,
    )

    return {
      threadId: typeof payload?.threadId === 'string' ? payload.threadId : '',
      createdAt: normalizeDateTime(payload?.createdAt),
      summary: typeof payload?.summary === 'string' ? payload.summary : '',
    } satisfies AssistantThreadSummary
  },

  async getMessages(
    context: AssistantAgentRequestContext,
    threadId: string,
    options?: {
      thinkingTitle?: string
    },
  ): Promise<Array<AssistantWorkbenchMessage>> {
    const metas = buildAgentRequestMetas(context)

    const payload = await agentService.getMessages(threadId, metas)
    const documentInfoById = await resolveMessageDocumentInfoMap(payload)

    return mergeRunToolSummaryMessages(
      payload.map((message) =>
        normalizeMessage(message, {
          ...options,
          documentInfoById,
        }),
      ),
    )
  },

  async getRun(
    context: AssistantAgentRequestContext,
    runId: string,
  ): Promise<AssistantRunDetail> {
    const metas = buildAgentRequestMetas(context)

    const payload = await agentService.getRun(runId, metas)

    return {
      id: typeof payload?.id === 'string' ? payload.id : runId,
      messageId:
        typeof payload?.messageId === 'string' ? payload.messageId : '',
      threadId: typeof payload?.threadId === 'string' ? payload.threadId : '',
      status:
        typeof payload?.status === 'string' ? payload.status : 'UNSPECIFIED',
      createdAt: normalizeDateTime(payload?.createdAt),
      updatedAt: normalizeDateTime(payload?.updatedAt),
      completedAt: normalizeNullableDateTime(payload?.completedAt),
    } satisfies AssistantRunDetail
  },

  async getRunProgress(
    context: AssistantAgentRequestContext,
    runId: string,
  ): Promise<Array<AssistantRunProgressGroup>> {
    const metas = buildAgentRequestMetas(context)

    const payload = await agentService.getRunProgress(runId, metas)

    return payload.map((group) => ({
      runId: typeof group?.runId === 'string' ? group.runId : runId,
      step: typeof group?.step === 'string' ? group.step : '',
      items: Array.isArray(group.items)
        ? group.items.flatMap((item) => {
            if (!item || typeof item !== 'object') {
              return []
            }

            const record = item as Record<string, unknown>

            return [
              {
                id:
                  typeof record.id === 'string' && record.id
                    ? record.id
                    : `run-progress-${runId}-${Math.random().toString(36).slice(2, 10)}`,
                data: typeof record.data === 'string' ? record.data : '',
                itemIndex: normalizeInteger(record.itemIndex),
                createdAt: normalizeDateTime(record.createdAt),
              },
            ]
          })
        : [],
    })) satisfies Array<AssistantRunProgressGroup>
  },

  async getPendingInteractions(
    context: AssistantAgentRequestContext,
    threadId: string,
    options?: {
      defaultTitle?: string
    },
  ): Promise<Array<AssistantPendingInteraction>> {
    const metas = buildAgentRequestMetas(context)

    const payload = await agentService.getPendingInteractions(threadId, metas)

    return payload.map((item) => ({
      id: typeof item?.id === 'string' ? item.id : '',
      threadId: typeof item?.threadId === 'string' ? item.threadId : threadId,
      runId: typeof item?.runId === 'string' ? item.runId : '',
      lastEventId: toNullableString(item.lastEventId),
      kind: normalizeInteractionKind(item.kind),
      title:
        typeof item.title === 'string'
          ? item.title
          : (options?.defaultTitle ?? getAssistantMessages().errors.interactionTitle),
      body: toNullableString(item.body),
      selectionMode: normalizeInteractionSelectionMode(item.selectionMode),
      options: Array.isArray(item.options)
        ? item.options.flatMap((option) => {
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
                    description: toNullableString(record.description),
                    disabled:
                      typeof record.disabled === 'boolean'
                        ? record.disabled
                        : null,
                  },
                ]
              : []
          })
        : [],
      status: normalizeInteractionStatus(item.status),
      createdAt: normalizeDateTime(item.createdAt),
      respondedAt: normalizeNullableDateTime(item.respondedAt),
    }))
  },

  async sendMessage(
    context: AssistantAgentRequestContext,
    input: AssistantSendMessageInput,
  ): Promise<{
    messageId: string
    runId: string
    threadId?: string
  }> {
    const metas = buildAgentRequestMetas(context)

    return (await agentService.sendMessage(
      input.threadId as string,
      buildSendMessagePayload(input),
      buildOrgInfo(context),
      input.threadTags?.length ? input.threadTags : null,
      resolveAgentLang(input.lang),
      metas,
    )) as AgentMessageResponse & {
      threadId?: string
    }
  },

  async cancelRun(context: AssistantAgentRequestContext, runId: string) {
    const metas = buildAgentRequestMetas(context)

    await agentService.cancelRun(runId, metas)
  },

  async submitInteraction(
    context: AssistantAgentRequestContext,
    input: {
      threadId: string
      runId: string
      interactionId: string
      selectedOptionIds: Array<string>
    },
  ): Promise<Record<string, unknown>> {
    const metas = buildAgentRequestMetas(context)

    return (await agentService.submitInteraction(
      input.threadId,
      input.runId,
      input.interactionId,
      null,
      input.selectedOptionIds,
      buildOrgInfo(context),
      metas,
    )) as Record<string, unknown>
  },

  async subscribeToRun(
    context: AssistantAgentRequestContext,
    input: {
      runId: string
      lastEventId?: string | null
      signal?: AbortSignal
      onPacket: (packet: AssistantStreamPacket) => void
      eventStreamFailedMessage?: string
    },
  ) {
    assertOperatorId(context.operatorId)

    const query = new URLSearchParams({ runId: input.runId })

    if (input.lastEventId) {
      query.set('lastEventId', input.lastEventId)
    }

    try {
      const response = await fetch(
        `${buildAgentServiceUrl('getEvents')}?${query.toString()}`,
        {
          method: 'GET',
          headers: getConfiguredAgentEventHeaders({
            accept: 'text/event-stream',
            'vrpc-operator': buildOperatorHeader(context.operatorId),
          }),
          credentials: 'include',
          cache: 'no-cache',
          signal: input.signal,
        },
      )

      if (!response.ok || !response.body) {
        await parseJsonResponse(
          response,
          input.eventStreamFailedMessage ??
            getAssistantMessages().errors.eventStreamFailed,
        )
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let done = false

      while (!done) {
        const result = await reader.read()
        done = result.done
        buffer += decoder.decode(result.value ?? new Uint8Array(), {
          stream: !done,
        })

        let boundary = findBoundary(buffer)

        while (boundary) {
          const rawEvent = buffer.slice(0, boundary.index)
          buffer = buffer.slice(boundary.index + boundary.length)

          const parsedEvent = parseSseEvent(rawEvent)

          if (parsedEvent.data.trim()) {
            const packet = JSON.parse(parsedEvent.data) as AssistantStreamPacket
            input.onPacket(packet)
          }

          boundary = findBoundary(buffer)
        }
      }

      if (buffer.trim()) {
        const parsedEvent = parseSseEvent(buffer)

        if (parsedEvent.data.trim()) {
          input.onPacket(JSON.parse(parsedEvent.data) as AssistantStreamPacket)
        }
      }
    } catch (error) {
      if (isAbortLikeError(error, input.signal)) {
        return
      }

      throw error
    }
  },
}
