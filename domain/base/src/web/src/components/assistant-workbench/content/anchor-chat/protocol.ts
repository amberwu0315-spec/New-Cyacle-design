import type {
  AssistantAnchorChatOpenRequest,
  AssistantAnchorChatProtocol,
  AssistantLaunchArea,
  AssistantWorkbenchMessage,
} from '../../model'
import { assistantWorkbenchActions } from '../../store'
import type { AppMessages } from '#/components/assistant-workbench/i18n/index.ts'

type AssistantWorkbenchMessages = AppMessages['assistantWorkbench']

function buildMessageId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

export function createAssistantAnchorChatProtocol(args: {
  launchArea: AssistantLaunchArea
  seedMessages?: Array<AssistantWorkbenchMessage>
  feedback?: AssistantAnchorChatProtocol['feedback']
  session?: AssistantAnchorChatProtocol['session']
}): AssistantAnchorChatProtocol {
  return {
    type: 'anchor-chat',
    version: 1,
    launchArea: args.launchArea,
    session: args.session,
    seed: args.seedMessages ? { messages: args.seedMessages } : undefined,
    feedback: args.feedback,
  }
}

export function createAssistantAnchorChatSession(args?: {
  activationId?: string
  threadStrategy?: NonNullable<
    AssistantAnchorChatProtocol['session']
  >['threadStrategy']
}) {
  return {
    activationId: args?.activationId ?? crypto.randomUUID(),
    threadStrategy: args?.threadStrategy ?? 'reuse-current-thread',
  } satisfies NonNullable<AssistantAnchorChatProtocol['session']>
}

export function resolveAssistantAnchorChatSession(args: {
  requestedSession?: AssistantAnchorChatProtocol['session']
  currentSession?: AssistantAnchorChatProtocol['session'] | null
  threadStrategy?: NonNullable<
    AssistantAnchorChatProtocol['session']
  >['threadStrategy']
}) {
  if (args.requestedSession) {
    return args.requestedSession
  }

  if (args.threadStrategy === 'new-thread') {
    return createAssistantAnchorChatSession({
      threadStrategy: 'new-thread',
    })
  }

  if (args.currentSession) {
    return args.currentSession
  }

  return createAssistantAnchorChatSession({
    threadStrategy: args.threadStrategy,
  })
}

export function openAssistantAnchorChat(
  args: AssistantAnchorChatOpenRequest & {
    seedMessages?: Array<AssistantWorkbenchMessage>
    session?: AssistantAnchorChatProtocol['session']
  },
) {
  const protocol = createAssistantAnchorChatProtocol({
    launchArea: args.launchArea,
    seedMessages: args.seedMessages,
    feedback: args.feedback,
    session: args.session ?? createAssistantAnchorChatSession(),
  })

  assistantWorkbenchActions.openWithProtocol(protocol, {
    renderMode: args.renderMode,
    resetDraft: args.resetDraft,
    requestFocus: args.requestFocus,
  })

  return protocol
}

export function buildAssistantAnchorChatSeedMessages(
  launchArea: AssistantLaunchArea,
  messages?: AssistantWorkbenchMessages,
): Array<AssistantWorkbenchMessage> {
  const now = Date.now()
  const seedMessages = messages?.collaboration.seed

  return [
    {
      id: buildMessageId('assistant-anchor-seed'),
      role: 'system',
      kind: 'action',
      title: seedMessages?.initializedTitle ?? '任务已初始化',
      content:
        seedMessages?.initializedContent(launchArea.area.title) ??
        `已为「${launchArea.area.title}」创建协作入口，等待智能体和业务方继续协作。`,
      createdAt: new Date(now - 2 * 60 * 1000).toISOString(),
      anchorId: launchArea.area.id,
      status: 'completed',
    },
    {
      id: buildMessageId('assistant-anchor-seed'),
      role: 'agent',
      kind: 'action',
      title: seedMessages?.completedTitle ?? '研究已完成',
      content:
        seedMessages?.completedContent ??
        '智能体已完成首轮研究，并生成可继续定点优化的工作台内容。',
      createdAt: new Date(now - 60 * 1000).toISOString(),
      anchorId: launchArea.area.id,
      status: 'completed',
    },
  ]
}
