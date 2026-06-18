import {
  configureAssistantAgentRuntime,
  configureWebProjectConfig,
  getSessionCredential,
  getSessionScopeCredential,
  vrpcClient,
  type WebProjectConfig,
} from '@carbonnt-cyacle/web-base'
import type {
  AgentInteraction,
  MessageResponse,
  RunDetail,
  RunProgressGroup,
  Thread,
} from '@carbonnt-cyacle/web-lca-core/pub'
import {
  getDocumentDownloadUrl,
  uploadDocumentFile,
} from '@carbonnt-cyacle/web-uic'

const LCA_AGENT_SERVICE_NAME = 'lca.core.AgentService'

type AgentRequestOptions = {
  headers?: HeadersInit
  suppressGlobalToast?: boolean
}

function buildAgentServiceUrl(path: string) {
  return `/${LCA_AGENT_SERVICE_NAME}/${path}`.replace(/\/+/g, '/')
}

function buildAuthorizationHeader() {
  const sessionCredential = getSessionCredential()

  if (!sessionCredential) {
    return null
  }

  return `session ${sessionCredential}, scope ${getSessionScopeCredential()}`
}

function buildEventStreamHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers)
  const authorization = buildAuthorizationHeader()

  nextHeaders.set('accept', 'text/event-stream')

  if (authorization) {
    nextHeaders.set('Authorization', authorization)
  }

  return nextHeaders
}

function invokeAgent<TResponse>(
  methodName: string,
  params: Record<string, unknown> | null,
  options?: AgentRequestOptions,
) {
  return vrpcClient.invoke<TResponse>({
    serviceName: LCA_AGENT_SERVICE_NAME,
    methodName,
    params,
    options,
  })
}

/**
 * 定义 Web 静态配置，可以给所有的 domain 共享。
 * app router 启动时会断言配置已经完成；缺少配置会在编译期或运行时明确失败。
 *
 * @example
 * ```ts
 * import { getWebProjectConfig } from '@carbonnt-cyacle/web-base'
 *
 * const config = getWebProjectConfig()
 * ```
 */
const webProjectConfig = {
  routes: {
    loginPath: '/uic/login',
  },
  uploadServices: {
    file: {
      publicUploadPath: '/file.FileWeb/FileService/public/upload',
      publicDownloadPath: '/file.FileWeb/FileService/public/download',
      privateUploadPath: '/file.FileWeb/FileService/upload',
      privateDownloadPath: '/file.FileWeb/FileService/download',
    },
    document: {
      uploadPath: '/uic.DocumentWeb/DocumentService/upload',
      downloadPath: '/uic.DocumentWeb/DocumentService/download',
    },
  },
} satisfies WebProjectConfig

configureWebProjectConfig(webProjectConfig)

configureAssistantAgentRuntime({
  agentService: {
    cancelRun: (runId, metas) =>
      invokeAgent<void>('cancelRun', { runId }, metas as AgentRequestOptions),
    getMessages: (threadId, metas) =>
      invokeAgent<Array<Record<string, unknown>>>(
        'getMessages',
        { threadId },
        metas as AgentRequestOptions,
      ),
    getPendingInteractions: (threadId, metas) =>
      invokeAgent<Array<AgentInteraction>>(
        'getPendingInteractions',
        { threadId },
        metas as AgentRequestOptions,
      ),
    getRun: (runId, metas) =>
      invokeAgent<RunDetail>('getRun', { runId }, metas as AgentRequestOptions),
    getRunProgress: (runId, metas) =>
      invokeAgent<Array<RunProgressGroup>>(
        'getRunProgress',
        { runId },
        metas as AgentRequestOptions,
      ),
    getThreads: (tags, metas) =>
      invokeAgent<Array<Thread>>(
        'getThreads',
        { tags: tags?.length ? tags : null },
        metas as AgentRequestOptions,
      ),
    newThread: (tags, metas) =>
      invokeAgent<Thread>(
        'newThread',
        { tags: tags?.length ? tags : null },
        metas as AgentRequestOptions,
      ),
    sendMessage: (threadId, message, orgInfo, threadTags, _language, metas) =>
      invokeAgent<MessageResponse & { threadId?: string }>(
        'sendMessage',
        {
          threadId,
          message,
          orgInfo: orgInfo ?? null,
          threadTags: threadTags?.length ? threadTags : null,
        },
        metas as AgentRequestOptions,
      ),
    submitInteraction: (
      threadId,
      runId,
      interactionId,
      confirmed,
      selectedOptionIds,
      orgInfo,
      metas,
    ) =>
      invokeAgent<Record<string, unknown>>(
        'submitInteraction',
        {
          threadId,
          runId,
          interactionId,
          confirmed: confirmed ?? null,
          selectedOptionIds: selectedOptionIds?.length
            ? selectedOptionIds
            : null,
          orgInfo: orgInfo ?? null,
        },
        metas as AgentRequestOptions,
      ),
  },
  buildAgentEventUrl: buildAgentServiceUrl,
  getAgentEventHeaders: buildEventStreamHeaders,
  getDocumentDownloadUrl,
  getDocumentInfoByIds: () => [],
  uploadAttachment: (attachment, { organizationId }) =>
    uploadDocumentFile({
      file: attachment.file,
      organizationId,
    }),
})
