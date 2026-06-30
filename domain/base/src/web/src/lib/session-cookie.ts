import Cookies from 'js-cookie'

export const SESSION_COOKIE_KEY = 'NSID'
export const SESSION_COOKIE_EXPIRES_DAYS = 365
export const SESSION_SCOPE_CREDENTIAL_EMPTY = '-'
const LOCAL_WORKSPACE_SCOPE_STORAGE_KEY = 'uic.workspace.lastSelectedScope'
const LEGACY_WORKSPACE_SCOPE_STORAGE_KEY = 'carbonnt.workspace.lastSelectedScope'

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

function isIpAddress(hostname: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')
}

function getCurrentHostname() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.location.hostname
}

function getCookieSecureOption() {
  return typeof window !== 'undefined' && window.location.protocol === 'https:'
}

function getLocalStorageItem(key: string) {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(key)?.trim() || null
  } catch {
    return null
  }
}

function setLocalStorageItem(key: string, value: string) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // localStorage can be unavailable in private or restricted contexts.
  }
}

function removeLocalStorageItem(key: string) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(key)
  } catch {
    // localStorage can be unavailable in private or restricted contexts.
  }
}

export function resolveSessionCookieDomain(hostname = getCurrentHostname()) {
  const normalizedHostname = hostname.trim().toLowerCase()

  if (
    !normalizedHostname ||
    LOCAL_HOSTNAMES.has(normalizedHostname) ||
    isIpAddress(normalizedHostname)
  ) {
    return undefined
  }

  const domainParts = normalizedHostname.split('.').filter(Boolean)

  if (domainParts.length < 2) {
    return undefined
  }

  return `.${domainParts.slice(-2).join('.')}`
}

export function getSessionCredential() {
  return Cookies.get(SESSION_COOKIE_KEY) ?? null
}

export function getSessionScope() {
  return (
    getLocalStorageItem(LOCAL_WORKSPACE_SCOPE_STORAGE_KEY) ??
    getLocalStorageItem(LEGACY_WORKSPACE_SCOPE_STORAGE_KEY)
  )
}

export function getSessionScopeCredential() {
  const scope = getSessionScope()?.trim()

  return scope || SESSION_SCOPE_CREDENTIAL_EMPTY
}

export function getSessionAuthorizationHeader() {
  const sessionCredential = getSessionCredential()

  if (!sessionCredential) {
    return null
  }

  return [
    `session ${sessionCredential}`,
    `scope ${getSessionScopeCredential()}`,
  ].join(', ')
}

export function setSessionCredential(sessionId: string) {
  const domain = resolveSessionCookieDomain()
  const secure = getCookieSecureOption()

  Cookies.set(SESSION_COOKIE_KEY, sessionId, {
    domain,
    expires: SESSION_COOKIE_EXPIRES_DAYS,
    path: '/',
    sameSite: 'none',
    secure,
  })
}

export function setSessionScope(scope: string) {
  const normalizedScope = scope.trim()

  if (!normalizedScope) {
    removeLocalStorageItem(LOCAL_WORKSPACE_SCOPE_STORAGE_KEY)
    removeLocalStorageItem(LEGACY_WORKSPACE_SCOPE_STORAGE_KEY)
    return
  }

  setLocalStorageItem(LOCAL_WORKSPACE_SCOPE_STORAGE_KEY, normalizedScope)
}

export function clearSessionCredential() {
  const domain = resolveSessionCookieDomain()
  const secure = getCookieSecureOption()

  Cookies.remove(SESSION_COOKIE_KEY, {
    domain,
    path: '/',
    sameSite: 'none',
    secure,
  })
}
