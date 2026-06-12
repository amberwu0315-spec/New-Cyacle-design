import { crossDomainRoutePaths } from './cross-domain-route-paths'
import { queryClient } from './query-client'
import { clearSessionCredential } from './session-cookie'

const LOGIN_PATH = crossDomainRoutePaths.uic.login

let isRedirectingToLogin = false

function getCurrentRedirectPath() {
  if (typeof window === 'undefined') {
    return undefined
  }

  if (window.location.pathname === LOGIN_PATH) {
    return undefined
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function createLoginPath(redirectPath = getCurrentRedirectPath()) {
  if (!redirectPath) {
    return LOGIN_PATH
  }

  const searchParams = new URLSearchParams({ redirect: redirectPath })

  return `${LOGIN_PATH}?${searchParams.toString()}`
}

export function clearAuthSessionSideEffects() {
  clearSessionCredential()
  queryClient.clear()
}

export function redirectToLoginWithCurrentLocation() {
  clearAuthSessionSideEffects()

  if (typeof window === 'undefined' || window.location.pathname === LOGIN_PATH) {
    return
  }

  if (isRedirectingToLogin) {
    return
  }

  isRedirectingToLogin = true
  window.location.replace(createLoginPath())
}
