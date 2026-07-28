import { beforeEach, describe, expect, it, vi } from 'vitest'

const vrpcClientMock = vi.hoisted(() => ({
  invoke: vi.fn(),
  use: vi.fn(),
}))

vi.mock('@carbonnt-cyacle/web-base', () => ({
  vrpcClient: vrpcClientMock,
}))

import { createAssistantAgentRuntimeConfig } from './assistant-agent-adapter.ts'

describe('assistant agent adapter', () => {
  beforeEach(() => {
    vrpcClientMock.invoke.mockReset()
  })

  it('adds vrpc-operator after vRPC validates application headers', async () => {
    const interceptor = vrpcClientMock.use.mock.calls[0]?.[0]
    const runtime = createAssistantAgentRuntimeConfig()

    vrpcClientMock.invoke.mockImplementation(async (request) => {
      expect(new Headers(request.options.headers).has('vrpc-operator')).toBe(
        false,
      )

      const context = {
        request,
        init: {
          headers: new Headers({ 'vrpc-client': 'client-info' }),
        },
      }

      await interceptor.beforeRequest(context)

      expect(new Headers(context.init.headers).get('vrpc-operator')).toBe(
        'encoded-operator',
      )

      return []
    })

    await runtime.agentService?.getThreads(null, {
      headers: {
        'vrpc-operator': 'encoded-operator',
      },
    })
  })

  it('routes run event subscriptions through AgentWeb', () => {
    const runtime = createAssistantAgentRuntimeConfig()

    expect(runtime.buildAgentEventUrl?.('getEvents')).toBe(
      '/agent.AgentWeb/getEvents',
    )
  })
})
