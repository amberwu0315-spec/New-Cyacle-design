import { getQueryClient } from '#/context/query-client.tsx'
import { clearSessionCredential } from '#/lib/session-cookie.ts'
import { getWebProjectConfig } from '#/lib/web-project-config.ts'

let isRedirectingToLogin = false
let loginPathOverride: string | undefined

export function setAuthLoginPathOverride(loginPath?: string) {
  const previousLoginPathOverride = loginPathOverride
  loginPathOverride = loginPath

  return () => {
    loginPathOverride = previousLoginPathOverride
  }
}

function getCurrentRedirectPath(loginPath: string) {
  if (typeof window === 'undefined') {
    return undefined
  }

  if (window.location.pathname === loginPath) {
    return undefined
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function createLoginPath(
  loginPath: string,
  redirectPath = getCurrentRedirectPath(loginPath),
) {
  if (!redirectPath) {
    return loginPath
  }

  const searchParams = new URLSearchParams({ redirect: redirectPath })

  return `${loginPath}?${searchParams.toString()}`
}

export function clearAuthSessionSideEffects() {
  clearSessionCredential()
  getQueryClient().clear()
}

export function redirectToLoginWithCurrentLocation(loginPath?: string) {
  clearAuthSessionSideEffects()

  if (typeof window === 'undefined') {
    return
  }

  const resolvedLoginPath =
    loginPath ?? loginPathOverride ?? getWebProjectConfig().routes.loginPath

  if (window.location.pathname === resolvedLoginPath) {
    return
  }

  if (isRedirectingToLogin) {
    return
  }

  isRedirectingToLogin = true
  window.location.replace(createLoginPath(resolvedLoginPath))
}
