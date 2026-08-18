// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AssistantInteractionCards } from './renderer'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AssistantInteractionCards', () => {
  it('submits the selected pending interaction option', () => {
    const handleSubmit = vi.fn()

    render(
      <AssistantInteractionCards
        interactions={[
          {
            id: 'interaction-1',
            threadId: 'thread-1',
            runId: 'run-1',
            kind: 'CHOICE',
            title: '请选择匹配方式',
            selectionMode: 'SINGLE',
            options: [
              { id: 'continue', label: '继续匹配' },
              { id: 'skip', label: '跳过' },
            ],
            status: 'PENDING',
            createdAt: '2026-08-04T08:00:00.000Z',
          },
        ]}
        onSubmit={handleSubmit}
      />,
    )

    fireEvent.click(screen.getByLabelText('继续匹配'))
    fireEvent.click(screen.getByRole('button', { name: '确认' }))

    expect(handleSubmit).toHaveBeenCalledWith({
      interactionId: 'interaction-1',
      selectedOptionIds: ['continue'],
    })
  })

  it('does not render interactions that have already been answered', () => {
    render(
      <AssistantInteractionCards
        interactions={[
          {
            id: 'interaction-answered',
            threadId: 'thread-1',
            runId: 'run-1',
            kind: 'CONFIRM',
            title: '已处理的确认',
            selectionMode: 'SINGLE',
            options: [{ id: 'confirm', label: '确认' }],
            status: 'ANSWERED',
            createdAt: '2026-08-04T08:00:00.000Z',
          },
        ]}
      />,
    )

    expect(screen.queryByText('已处理的确认')).toBeNull()
  })
})
