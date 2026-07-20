import {
  vrpcClient,
  type AssistantAgentRuntimeConfig,
  type AssistantRawAgentServiceClient,
} from '@carbonnt-cyacle/web-base'

const AGENT_RPC_SERVICE_NAME = 'agent.AgentService'
const AGENT_WEB_SERVICE_NAME = 'agent.AgentWeb'

type AgentRequestOptions = {
  headers?: HeadersInit
  suppressGlobalToast?: boolean
}

type AgentServiceResult<
  TMethod extends keyof AssistantRawAgentServiceClient,
> = AssistantRawAgentServiceClient[TMethod] extends (
  ...args: never[]
) => infer TResult
  ? Awaited<TResult>
  : never

function invokeAgent<TResponse>(
  methodName: string,
  params: Record<string, unknown> | null,
  options?: AgentRequestOptions,
) {
  return vrpcClient.invoke<TResponse>({
    serviceName: AGENT_RPC_SERVICE_NAME,
    methodName,
    params,
    options,
  })
}

function buildAgentEventUrl(path: string) {
  return `/${AGENT_WEB_SERVICE_NAME}/${path}`.replace(/\/+/g, '/')
}

function createAssistantAgentService() {
  return {
    cancelRun: (runId, metas) =>
      invokeAgent<AgentServiceResult<'cancelRun'>>(
        'cancelRun',
        { runId },
        metas as AgentRequestOptions,
      ),
    getMessages: (threadId, metas) =>
      invokeAgent<AgentServiceResult<'getMessages'>>(
        'getMessages',
        { threadId },
        metas as AgentRequestOptions,
      ),
    getPendingInteractions: (threadId, metas) =>
      invokeAgent<AgentServiceResult<'getPendingInteractions'>>(
        'getPendingInteractions',
        { threadId },
        metas as AgentRequestOptions,
      ),
    getRun: (runId, metas) =>
      invokeAgent<AgentServiceResult<'getRun'>>(
        'getRun',
        { runId },
        metas as AgentRequestOptions,
      ),
    getRunProgress: (runId, metas) =>
      invokeAgent<AgentServiceResult<'getRunProgress'>>(
        'getRunProgress',
        { runId },
        metas as AgentRequestOptions,
      ),
    getThreads: (tags, metas) =>
      invokeAgent<AgentServiceResult<'getThreads'>>(
        'getThreads',
        { tags: tags?.length ? tags : null },
        metas as AgentRequestOptions,
      ),
    newThread: (tags, metas) =>
      invokeAgent<AgentServiceResult<'newThread'>>(
        'newThread',
        { tags: tags?.length ? tags : null },
        metas as AgentRequestOptions,
      ),
    sendMessage: (threadId, message, orgInfo, threadTags, _language, metas) =>
      invokeAgent<AgentServiceResult<'sendMessage'>>(
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
      invokeAgent<AgentServiceResult<'submitInteraction'>>(
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
  } satisfies AssistantRawAgentServiceClient
}

export function createAssistantAgentRuntimeConfig() {
  return {
    agentService: createAssistantAgentService(),
    buildAgentEventUrl,
  } satisfies Pick<
    AssistantAgentRuntimeConfig,
    'agentService' | 'buildAgentEventUrl'
  >
}
