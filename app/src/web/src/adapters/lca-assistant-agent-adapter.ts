import {
  vrpcClient,
  type AssistantAgentRuntimeConfig,
  type AssistantRawAgentServiceClient,
} from '@carbonnt-cyacle/web-base'

const LCA_AGENT_SERVICE_NAME = 'lca.core.AgentService'

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

function invokeLcaAgent<TResponse>(
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

function buildLcaAgentServiceUrl(path: string) {
  return `/${LCA_AGENT_SERVICE_NAME}/${path}`.replace(/\/+/g, '/')
}

function createLcaAssistantAgentService() {
  return {
    cancelRun: (runId, metas) =>
      invokeLcaAgent<AgentServiceResult<'cancelRun'>>(
        'cancelRun',
        { runId },
        metas as AgentRequestOptions,
      ),
    getMessages: (threadId, metas) =>
      invokeLcaAgent<AgentServiceResult<'getMessages'>>(
        'getMessages',
        { threadId },
        metas as AgentRequestOptions,
      ),
    getPendingInteractions: (threadId, metas) =>
      invokeLcaAgent<AgentServiceResult<'getPendingInteractions'>>(
        'getPendingInteractions',
        { threadId },
        metas as AgentRequestOptions,
      ),
    getRun: (runId, metas) =>
      invokeLcaAgent<AgentServiceResult<'getRun'>>(
        'getRun',
        { runId },
        metas as AgentRequestOptions,
      ),
    getRunProgress: (runId, metas) =>
      invokeLcaAgent<AgentServiceResult<'getRunProgress'>>(
        'getRunProgress',
        { runId },
        metas as AgentRequestOptions,
      ),
    getThreads: (tags, metas) =>
      invokeLcaAgent<AgentServiceResult<'getThreads'>>(
        'getThreads',
        { tags: tags?.length ? tags : null },
        metas as AgentRequestOptions,
      ),
    newThread: (tags, metas) =>
      invokeLcaAgent<AgentServiceResult<'newThread'>>(
        'newThread',
        { tags: tags?.length ? tags : null },
        metas as AgentRequestOptions,
      ),
    sendMessage: (threadId, message, orgInfo, threadTags, _language, metas) =>
      invokeLcaAgent<AgentServiceResult<'sendMessage'>>(
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
      invokeLcaAgent<AgentServiceResult<'submitInteraction'>>(
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

export function createLcaAssistantAgentRuntimeConfig() {
  return {
    agentService: createLcaAssistantAgentService(),
    buildAgentEventUrl: buildLcaAgentServiceUrl,
  } satisfies Pick<
    AssistantAgentRuntimeConfig,
    'agentService' | 'buildAgentEventUrl'
  >
}
