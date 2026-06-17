import { queryClient } from '#/lib/query-client.tsx'
import { clearSessionCredential } from '#/lib/session-cookie.ts'

const DEFAULT_LOGIN_PATH = '/uic/login'

let isRedirectingToLogin = false
let configuredLoginPath = DEFAULT_LOGIN_PATH

export type AuthSessionConfig = {
  loginPath?: string
}

function normalizeLoginPath(loginPath: string | undefined) {
  const normalizedPath = loginPath?.trim()

  return normalizedPath || DEFAULT_LOGIN_PATH
}

export function configureAuthSession(config: AuthSessionConfig) {
  configuredLoginPath = normalizeLoginPath(config.loginPath)
}

function getCurrentRedirectPath() {
  if (typeof window === 'undefined') {
    return undefined
  }

  if (window.location.pathname === configuredLoginPath) {
    return undefined
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function createLoginPath(redirectPath = getCurrentRedirectPath()) {
  if (!redirectPath) {
    return configuredLoginPath
  }

  const searchParams = new URLSearchParams({ redirect: redirectPath })

  return `${configuredLoginPath}?${searchParams.toString()}`
}

export function clearAuthSessionSideEffects() {
  clearSessionCredential()
  queryClient.clear()
}

export function redirectToLoginWithCurrentLocation() {
  clearAuthSessionSideEffects()

  if (
    typeof window === 'undefined' ||
    window.location.pathname === configuredLoginPath
  ) {
    return
  }

  if (isRedirectingToLogin) {
    return
  }

  isRedirectingToLogin = true
  window.location.replace(createLoginPath())
}
