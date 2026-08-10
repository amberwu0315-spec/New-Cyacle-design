// @vitest-environment jsdom

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { configureTestWebProjectConfig } from '#/test/web-project-config.ts'
import { assistantAgentService } from '../service'
import { useAssistantAgentSession } from './use-assistant-agent-session'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.restoreAllMocks()
})

beforeEach(() => {
  configureTestWebProjectConfig()
})

describe('useAssistantAgentSession run status reconciliation', () => {
  it('recovers a failed run when its terminal SSE event is missing', async () => {
    vi.spyOn(assistantAgentService, 'getThreads').mockResolvedValue([
      {
        threadId: 'thread-1',
        createdAt: '2026-08-09T08:00:00.000Z',
        summary: '研究任务',
      },
    ])
    vi.spyOn(assistantAgentService, 'getMessages').mockResolvedValue([])
    vi.spyOn(
      assistantAgentService,
      'getPendingInteractions',
    ).mockResolvedValue([])
    vi.spyOn(assistantAgentService, 'getRunProgress').mockResolvedValue([])
    const getRunSpy = vi
      .spyOn(assistantAgentService, 'getRun')
      .mockResolvedValueOnce({
        id: 'run-1',
        messageId: 'message-1',
        threadId: 'thread-1',
        status: 'RUNNING',
        createdAt: '2026-08-09T08:00:00.000Z',
        updatedAt: '2026-08-09T08:00:01.000Z',
        completedAt: null,
      })
      .mockResolvedValue({
        id: 'run-1',
        messageId: 'message-1',
        threadId: 'thread-1',
        status: 'FAILED',
        createdAt: '2026-08-09T08:00:00.000Z',
        updatedAt: '2026-08-09T08:00:03.000Z',
        completedAt: '2026-08-09T08:00:03.000Z',
      })
    vi.spyOn(assistantAgentService, 'subscribeToRun').mockImplementation(
      async (_context, input) =>
        new Promise<void>((resolve) => {
          input.signal?.addEventListener('abort', () => resolve(), {
            once: true,
          })
        }),
    )

    const { result } = renderHook(
      () =>
        useAssistantAgentSession({
          scopeId: 'scope-run-reconciliation',
          activeTarget: null,
          resumeRunId: 'run-1',
          operatorId: '10001',
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(
      () => {
        expect(getRunSpy).toHaveBeenCalledTimes(2)
        expect(result.current.currentRun).toEqual(
          expect.objectContaining({
            runId: 'run-1',
            status: 'failed',
            terminalEventReceived: true,
          }),
        )
      },
      { timeout: 5_000 },
    )

    expect(assistantAgentService.getRunProgress).toHaveBeenCalledWith(
      expect.objectContaining({ operatorId: '10001' }),
      'run-1',
    )
  })
})
