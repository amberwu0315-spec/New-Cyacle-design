// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

const cookiesMock = vi.hoisted(() => ({
  get: vi.fn(),
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
  cookiesMock.set.mockReset()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('languageStore', () => {
  it('uses SameSite=Lax for http deployments', async () => {
    stubWindowLocation('http://vine-admin.cyacle-dev.cn:7088/')

    const { LANGUAGE_COOKIE_NAME, languageStore } = await import(
      '#/lib/i18n/language-store.ts'
    )

    languageStore.setLanguage('en-US')

    expect(LANGUAGE_COOKIE_NAME).toBe('lang')
    expect(cookiesMock.set).toHaveBeenCalledWith('lang', 'en-US', {
      domain: '.cyacle-dev.cn',
      expires: 365,
      path: '/',
      sameSite: 'lax',
      secure: false,
    })
  })

  it('uses SameSite=None and Secure for https deployments', async () => {
    stubWindowLocation('https://vine-admin.cyacle-dev.cn/')

    const { languageStore } = await import('#/lib/i18n/language-store.ts')

    languageStore.setLanguage('en-US')

    expect(cookiesMock.set).toHaveBeenCalledWith('lang', 'en-US', {
      domain: '.cyacle-dev.cn',
      expires: 365,
      path: '/',
      sameSite: 'none',
      secure: true,
    })
  })
})
