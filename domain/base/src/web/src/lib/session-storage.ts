export const SESSION_STORAGE_KEY = 'NSID'
export const SESSION_SCOPE_CREDENTIAL_EMPTY = '-'
const LOCAL_WORKSPACE_SCOPE_STORAGE_KEY = 'uic.workspace.lastSelectedScope'
const LEGACY_WORKSPACE_SCOPE_STORAGE_KEY = 'carbonnt.workspace.lastSelectedScope'

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

export function getSessionCredential() {
  return getLocalStorageItem(SESSION_STORAGE_KEY)
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
  setLocalStorageItem(SESSION_STORAGE_KEY, sessionId)
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
  removeLocalStorageItem(SESSION_STORAGE_KEY)
}
