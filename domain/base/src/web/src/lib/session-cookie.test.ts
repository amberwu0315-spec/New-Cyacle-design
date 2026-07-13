// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  clearSessionCredential,
  SESSION_COOKIE_EXPIRES_DAYS,
  SESSION_COOKIE_KEY,
  setSessionCredential,
} from '#/lib/session-cookie.ts'

const cookiesMock = vi.hoisted(() => ({
  get: vi.fn(),
  remove: vi.fn(),
  set: vi.fn(),
}))

vi.mock('js-cookie', () => ({
  default: cookiesMock,
}))

function stubWindowLocation(url: string) {
  const parsedUrl = new URL(url)

  vi.stubGlobal('window', {
    location: {
      hostname: parsedUrl.hostname,
      protocol: parsedUrl.protocol,
    },
  })
}

afterEach(() => {
  cookiesMock.get.mockReset()
  cookiesMock.remove.mockReset()
  cookiesMock.set.mockReset()
  vi.unstubAllGlobals()
})

describe('setSessionCredential', () => {
  it('uses SameSite=Lax for http deployments', () => {
    stubWindowLocation(
      'http://vine-admin.cyacle-dev.cn:7088/uic/login?redirect=%2F',
    )

    setSessionCredential('session-1')

    expect(SESSION_COOKIE_KEY).toBe('NSID_SE')
    expect(cookiesMock.set).toHaveBeenCalledWith('NSID_SE', 'session-1', {
      domain: '.cyacle-dev.cn',
      expires: SESSION_COOKIE_EXPIRES_DAYS,
      path: '/',
      sameSite: 'lax',
      secure: false,
    })
  })

  it('uses SameSite=None and Secure for https deployments', () => {
    stubWindowLocation('https://vine-admin.cyacle-dev.cn/uic/login')

    setSessionCredential('session-1')

    clearSessionCredential()

    expect(cookiesMock.set).toHaveBeenCalledWith('NSID_SE', 'session-1', {
      domain: '.cyacle-dev.cn',
      expires: SESSION_COOKIE_EXPIRES_DAYS,
      path: '/',
      sameSite: 'none',
      secure: true,
    })
    expect(cookiesMock.remove).toHaveBeenCalledWith('NSID_SE', {
      domain: '.cyacle-dev.cn',
      path: '/',
      sameSite: 'none',
      secure: true,
    })
  })
})
