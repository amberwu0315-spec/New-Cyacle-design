import type {
  AssistantAnchorChatOpenRequest,
  AssistantAnchorChatProtocol,
  AssistantLaunchArea,
  AssistantWorkbenchMessage,
} from '../../model'
import { assistantWorkbenchActions } from '../../store'
import { createPrefixedAssistantId, createAssistantRandomId } from '../../lib/id'
import {
  getAssistantWorkbenchMessages,
  getCurrentLanguage,
  type AppMessages,
} from '#/components/assistant-workbench/i18n/index.ts'

type AssistantWorkbenchMessages = AppMessages['assistantWorkbench']

function buildMessageId(prefix: string) {
  return createPrefixedAssistantId(prefix)
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
    activationId: args?.activationId ?? createAssistantRandomId(),
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
  const seedMessages =
    messages?.collaboration.seed ??
    getAssistantWorkbenchMessages(getCurrentLanguage()).assistantWorkbench
      .collaboration.seed

  return [
    {
      id: buildMessageId('assistant-anchor-seed'),
      role: 'system',
      kind: 'action',
      title: seedMessages.initializedTitle,
      content: seedMessages.initializedContent(launchArea.area.title),
      createdAt: new Date(now - 2 * 60 * 1000).toISOString(),
      anchorId: launchArea.area.id,
      status: 'completed',
    },
    {
      id: buildMessageId('assistant-anchor-seed'),
      role: 'agent',
      kind: 'action',
      title: seedMessages.completedTitle,
      content: seedMessages.completedContent,
      createdAt: new Date(now - 60 * 1000).toISOString(),
      anchorId: launchArea.area.id,
      status: 'completed',
    },
  ]
}
