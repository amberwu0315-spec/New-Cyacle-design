import { afterEach, describe, expect, it, vi } from 'vitest'

import { createAssistantRandomId, createPrefixedAssistantId } from './id'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('assistant workbench id helpers', () => {
  it('uses crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'uuid-from-random-uuid'),
    })

    expect(createAssistantRandomId()).toBe('uuid-from-random-uuid')
    expect(createPrefixedAssistantId('message')).toBe(
      'message-uuid-from-random-uuid',
    )
  })

  it('falls back to getRandomValues when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: vi.fn((bytes: Uint8Array) => {
        bytes.set([
          0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa,
          0xbb, 0xcc, 0xdd, 0xee, 0xff,
        ])
        return bytes
      }),
    })

    expect(createAssistantRandomId()).toBe(
      '00112233-4455-4677-8899-aabbccddeeff',
    )
  })
})
