import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  clearQueryClient: vi.fn(),
  clearSessionCredential: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('#/context/query-client.tsx', () => ({
  getQueryClient: () => ({ clear: mocks.clearQueryClient }),
}))

vi.mock('#/lib/session-storage.ts', () => ({
  clearSessionCredential: mocks.clearSessionCredential,
}))

vi.mock('#/lib/web-project-config.ts', () => ({
  getWebProjectConfig: () => ({ routes: { loginPath: '/uic/login' } }),
}))

beforeEach(() => {
  vi.resetModules()
  mocks.clearQueryClient.mockReset()
  mocks.clearSessionCredential.mockReset()
  mocks.replace.mockReset()
  vi.stubGlobal('window', {
    location: {
      hash: '#section',
      pathname: '/catalog/items',
      replace: mocks.replace,
      search: '?page=2',
    },
  })
})

describe('redirectToLoginWithCurrentLocation', () => {
  it('supports an explicit login route while preserving the current location', async () => {
    const { redirectToLoginWithCurrentLocation } = await import(
      '#/lib/auth-session.ts'
    )

    redirectToLoginWithCurrentLocation('/auth/external/start')

    expect(mocks.clearSessionCredential).toHaveBeenCalledOnce()
    expect(mocks.clearQueryClient).toHaveBeenCalledOnce()
    expect(mocks.replace).toHaveBeenCalledWith(
      '/auth/external/start?redirect=%2Fcatalog%2Fitems%3Fpage%3D2%23section',
    )
  })

  it('uses the configured runtime login route for global unauthorized redirects', async () => {
    const {
      redirectToLoginWithCurrentLocation,
      setAuthLoginPathOverride,
    } = await import('#/lib/auth-session.ts')

    setAuthLoginPathOverride('/auth/runtime/start')
    redirectToLoginWithCurrentLocation()

    expect(mocks.replace).toHaveBeenCalledWith(
      '/auth/runtime/start?redirect=%2Fcatalog%2Fitems%3Fpage%3D2%23section',
    )
  })
})
