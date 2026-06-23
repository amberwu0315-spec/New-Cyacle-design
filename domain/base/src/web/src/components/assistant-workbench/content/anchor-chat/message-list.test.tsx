// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AssistantAnchorChatMessageList } from './message-list'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AssistantAnchorChatMessageList', () => {
  it('renders run progress echo only once for repeated messages from the same run', () => {
    render(
      <AssistantAnchorChatMessageList
        messages={[
          {
            id: 'msg-run-tool-call',
            runId: 'run-duplicated-progress',
            role: 'assistant',
            kind: 'action',
            content: '',
            createdAt: '2026-06-23T08:44:34.000Z',
            status: 'completed',
            toolCalls: [
              {
                id: 'call-1',
                name: 'replace_unit_process_factor',
              },
            ],
          },
          {
            id: 'msg-run-tool-result',
            runId: 'run-duplicated-progress',
            role: 'system',
            kind: 'action',
            content: '',
            createdAt: '2026-06-23T08:44:34.000Z',
            status: 'completed',
            toolResults: [
              {
                id: 'call-1',
                name: 'replace_unit_process_factor',
              },
            ],
          },
          {
            id: 'msg-run-final',
            runId: 'run-duplicated-progress',
            role: 'assistant',
            kind: 'action',
            content: '已完成替换。',
            createdAt: '2026-06-23T08:44:35.000Z',
            status: 'completed',
          },
        ]}
        runProgressStateByRunId={{
          'run-duplicated-progress': {
            status: 'loaded',
            errorMessage: null,
            groups: [
              {
                runId: 'run-duplicated-progress',
                step: 'modelNodeModified',
                items: [
                  {
                    id: 'progress-1',
                    data: '{"modeNodeId":"node-1","modeNodeName":"石英砂的生产"}',
                    itemIndex: 0,
                    createdAt: '2026-06-23T08:44:35.000Z',
                  },
                ],
              },
            ],
          },
        }}
        renderRunProgressContent={() => <div>只显示一次执行结果</div>}
      />,
    )

    expect(screen.getAllByText('只显示一次执行结果')).toHaveLength(1)
  })
})
