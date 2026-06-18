import type { AssistantDraftAttachment } from '../content'
import type {
  AssistantAnchorDeclaration,
  AssistantStreamPacket,
  AssistantThreadTag,
} from '../model'

export const Lang = {
  LangEn: 'en-US',
  LangZh: 'zh-CN',
} as const

export type AppLanguage = 'zh-CN' | 'en-US'

export interface AgentOrgInfo {
  organizationId?: string | null
  workspaceId?: string | null
}

export interface AgentMessage {
  anchors?: Array<AssistantAnchorDeclaration>
  content: string
  documentIds?: Array<string>
  fileIds?: Array<string>
  threadId?: string
}

export interface AgentMessageResponse {
  messageId: string
  runId: string
  threadId?: string
}

export interface DocumentByIdEntry {
  id: string
  name: string
}

export interface AssistantRawAgentServiceClient {
  cancelRun: (runId: string, metas?: unknown) => Promise<void> | void
  getMessages: (
    threadId: string,
    metas?: unknown,
  ) => Promise<Array<Record<string, unknown>>> | Array<Record<string, unknown>>
  getPendingInteractions: (
    threadId: string,
    metas?: unknown,
  ) => Promise<Array<Record<string, unknown>>> | Array<Record<string, unknown>>
  getRun: (
    runId: string,
    metas?: unknown,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>
  getRunProgress: (
    runId: string,
    metas?: unknown,
  ) => Promise<Array<Record<string, unknown>>> | Array<Record<string, unknown>>
  getThreads: (
    tags?: Array<AssistantThreadTag> | null,
    metas?: unknown,
  ) => Promise<Array<Record<string, unknown>>> | Array<Record<string, unknown>>
  newThread: (
    tags?: Array<AssistantThreadTag> | null,
    metas?: unknown,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>
  sendMessage: (
    threadId: string,
    message: AgentMessage,
    orgInfo?: AgentOrgInfo | null,
    threadTags?: Array<AssistantThreadTag> | null,
    language?: (typeof Lang)[keyof typeof Lang],
    metas?: unknown,
  ) => Promise<AgentMessageResponse> | AgentMessageResponse
  submitInteraction: (
    threadId: string,
    runId: string,
    interactionId: string,
    confirmed?: boolean | null,
    selectedOptionIds?: Array<string> | null,
    orgInfo?: AgentOrgInfo | null,
    metas?: unknown,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>
  subscribeToRun?: (input: {
    context: AssistantAgentRequestContext
    eventStreamFailedMessage?: string
    lastEventId?: string | null
    onPacket: (packet: AssistantStreamPacket) => void
    runId: string
    signal?: AbortSignal
  }) => Promise<void> | void
}

export interface AssistantAgentRequestContext {
  operatorId: string
  workspaceId?: string | null
  organizationId?: string | null
}

export interface AssistantAgentRuntimeConfig {
  agentService?: AssistantRawAgentServiceClient | null
  getAgentEventHeaders?: (headers: HeadersInit) => HeadersInit
  buildAgentEventUrl?: (path: string) => string
  getDocumentDownloadUrl?: (documentId: string) => string | undefined
  getDocumentInfoByIds?: (
    documentIds: Array<string>,
  ) => Promise<Array<DocumentByIdEntry>> | Array<DocumentByIdEntry>
  uploadAttachment?: (
    attachment: AssistantDraftAttachment,
    options: { organizationId: string },
  ) => Promise<{ documentId?: string; fileId?: string; id?: string }>
}

let runtimeConfig: AssistantAgentRuntimeConfig = {}

function getRequiredAgentService() {
  if (!runtimeConfig.agentService) {
    throw new Error('Assistant agent service has not been configured.')
  }

  return runtimeConfig.agentService
}

export function configureAssistantAgentRuntime(
  config: AssistantAgentRuntimeConfig,
) {
  runtimeConfig = {
    ...runtimeConfig,
    ...config,
  }
}

export function getConfiguredDocumentDownloadUrl(documentId: string) {
  return runtimeConfig.getDocumentDownloadUrl?.(documentId)
}

export function getConfiguredAgentEventHeaders(headers: HeadersInit) {
  return runtimeConfig.getAgentEventHeaders?.(headers) ?? headers
}

export async function getConfiguredDocumentInfoByIds(
  documentIds: Array<string>,
) {
  return runtimeConfig.getDocumentInfoByIds?.(documentIds) ?? []
}

export async function uploadConfiguredAssistantAttachment(
  attachment: AssistantDraftAttachment,
  options: { organizationId: string },
) {
  if (!runtimeConfig.uploadAttachment) {
    throw new Error('Assistant attachment upload service has not been configured.')
  }

  return runtimeConfig.uploadAttachment(attachment, options)
}

export function buildConfiguredAgentEventUrl(path: string) {
  return runtimeConfig.buildAgentEventUrl?.(path) ?? path
}

export class AgentServiceClient {
  cancelRun(...args: Parameters<AssistantRawAgentServiceClient['cancelRun']>) {
    return getRequiredAgentService().cancelRun(...args)
  }

  getMessages(
    ...args: Parameters<AssistantRawAgentServiceClient['getMessages']>
  ) {
    return getRequiredAgentService().getMessages(...args)
  }

  getPendingInteractions(
    ...args: Parameters<
      AssistantRawAgentServiceClient['getPendingInteractions']
    >
  ) {
    return getRequiredAgentService().getPendingInteractions(...args)
  }

  getRun(...args: Parameters<AssistantRawAgentServiceClient['getRun']>) {
    return getRequiredAgentService().getRun(...args)
  }

  getRunProgress(
    ...args: Parameters<AssistantRawAgentServiceClient['getRunProgress']>
  ) {
    return getRequiredAgentService().getRunProgress(...args)
  }

  getThreads(
    ...args: Parameters<AssistantRawAgentServiceClient['getThreads']>
  ) {
    return getRequiredAgentService().getThreads(...args)
  }

  newThread(
    ...args: Parameters<AssistantRawAgentServiceClient['newThread']>
  ) {
    return getRequiredAgentService().newThread(...args)
  }

  sendMessage(
    ...args: Parameters<AssistantRawAgentServiceClient['sendMessage']>
  ) {
    return getRequiredAgentService().sendMessage(...args)
  }

  submitInteraction(
    ...args: Parameters<AssistantRawAgentServiceClient['submitInteraction']>
  ) {
    return getRequiredAgentService().submitInteraction(...args)
  }

  subscribeToRun(
    input: Parameters<NonNullable<AssistantRawAgentServiceClient['subscribeToRun']>>[0],
  ) {
    const client = getRequiredAgentService()

    if (!client.subscribeToRun) {
      throw new Error('Assistant event stream service has not been configured.')
    }

    return client.subscribeToRun(input)
  }
}
