import { afterEach, describe, expect, it, vi } from 'vitest'

import { assistantAgentService } from './agent-service'
import {
  configureAssistantAgentRuntime,
  type AssistantRawAgentServiceClient,
} from './agent-service-runtime'

function createAgentServiceMock(
  overrides: Partial<AssistantRawAgentServiceClient>,
): AssistantRawAgentServiceClient {
  return {
    cancelRun: vi.fn(),
    getMessages: vi.fn().mockResolvedValue([]),
    getPendingInteractions: vi.fn().mockResolvedValue([]),
    getRun: vi.fn().mockResolvedValue({}),
    getRunProgress: vi.fn().mockResolvedValue([]),
    getThreads: vi.fn().mockResolvedValue([]),
    newThread: vi.fn().mockResolvedValue({}),
    sendMessage: vi.fn().mockResolvedValue({
      messageId: 'message-1',
      runId: 'run-1',
    }),
    submitInteraction: vi.fn().mockResolvedValue({}),
    ...overrides,
  }
}

afterEach(() => {
  configureAssistantAgentRuntime({
    agentService: null,
    buildAgentEventUrl: undefined,
    getAgentEventHeaders: undefined,
    getDocumentDownloadUrl: undefined,
    getDocumentInfoByIds: undefined,
    uploadAttachment: undefined,
  })
  vi.restoreAllMocks()
})

describe('assistantAgentService', () => {
  it('collapses auxiliary tool messages into the final assistant message', async () => {
    configureAssistantAgentRuntime({
      agentService: createAgentServiceMock({
        getMessages: vi.fn().mockResolvedValue([
          {
            messageId: 'message-user',
            threadId: 'thread-tool-summary',
            runId: 'run-tool-summary',
            role: 'user',
            content: '替换模块下所有单元过程的因子',
            createdAt: '2026-06-23T16:42:00.000+08:00',
          },
          {
            messageId: 'message-tool-call',
            threadId: 'thread-tool-summary',
            runId: 'run-tool-summary',
            role: 'assistant',
            content: '',
            toolCalls: [
              {
                id: 'call-1',
                name: 'replace_unit_process_factor',
                input: '{"module":"原材料生产"}',
              },
            ],
            createdAt: '2026-06-23T16:44:34.000+08:00',
          },
          {
            messageId: 'message-tool-result',
            threadId: 'thread-tool-summary',
            runId: 'run-tool-summary',
            role: 'tool',
            content: '',
            toolResults: [
              {
                id: 'call-1',
                name: 'replace_unit_process_factor',
                output: '{"updated":5}',
              },
            ],
            createdAt: '2026-06-23T16:44:34.000+08:00',
          },
          {
            messageId: 'message-final',
            threadId: 'thread-tool-summary',
            runId: 'run-tool-summary',
            role: 'assistant',
            content: '已成功完成模块下所有 5 个单元过程的因子替换。',
            createdAt: '2026-06-23T16:44:35.000+08:00',
          },
        ]),
      }),
    })

    await expect(
      assistantAgentService.getMessages(
        { operatorId: '10001' },
        'thread-tool-summary',
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'message-user',
        role: 'user',
        content: '替换模块下所有单元过程的因子',
      }),
      expect.objectContaining({
        id: 'message-final',
        role: 'assistant',
        content: '已成功完成模块下所有 5 个单元过程的因子替换。',
        toolCalls: [
          {
            id: 'call-1',
            name: 'replace_unit_process_factor',
            input: '{"module":"原材料生产"}',
          },
        ],
        toolResults: [
          {
            id: 'call-1',
            name: 'replace_unit_process_factor',
            output: '{"updated":5}',
          },
        ],
      }),
    ])
  })
})
