import Cookies from 'js-cookie'

export const SESSION_COOKIE_KEY = 'NSID'
export const SESSION_COOKIE_EXPIRES_DAYS = 365

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

export function setSessionCredential(sessionId: string) {
  const domain = resolveSessionCookieDomain()
  const secure = getCookieSecureOption()

  Cookies.set(SESSION_COOKIE_KEY, sessionId, {
    domain,
    expires: SESSION_COOKIE_EXPIRES_DAYS,
    path: '/',
    sameSite: 'lax',
    secure,
  })
}

export function clearSessionCredential() {
  const domain = resolveSessionCookieDomain()
  const secure = getCookieSecureOption()

  Cookies.remove(SESSION_COOKIE_KEY, {
    domain,
    path: '/',
    sameSite: 'lax',
    secure,
  })
  Cookies.remove(SESSION_COOKIE_KEY, {
    path: '/',
    sameSite: 'lax',
    secure,
  })
}
