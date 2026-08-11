// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

import {
  clearSessionCredential,
  getSessionAuthorizationHeader,
  SESSION_STORAGE_KEY,
  setSessionCredential,
} from '#/lib/session-storage.ts'

afterEach(() => {
  window.localStorage.clear()
  document.cookie = 'NSID=; Max-Age=0; Path=/'
})

describe('getSessionAuthorizationHeader', () => {
  it('uses NSID from localStorage as the session credential', () => {
    window.localStorage.setItem('NSID', 'session-1')

    expect(getSessionAuthorizationHeader()).toBe('session session-1, scope -')
  })

  it('does not fall back to the NSID cookie', () => {
    document.cookie = 'NSID=legacy-session; Path=/'

    expect(getSessionAuthorizationHeader()).toBeNull()
  })
})

describe('setSessionCredential', () => {
  it('stores NSID in localStorage', () => {
    setSessionCredential('session-1')

    expect(SESSION_STORAGE_KEY).toBe('NSID')
    expect(window.localStorage.getItem('NSID')).toBe('session-1')
  })

  it('removes NSID from localStorage when clearing the session', () => {
    setSessionCredential('session-1')
    clearSessionCredential()

    expect(window.localStorage.getItem('NSID')).toBeNull()
  })
})
