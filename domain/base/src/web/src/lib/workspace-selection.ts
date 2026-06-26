export const SELECTED_WORKSPACE_ID_STORAGE_KEY =
  'carbonnt.workspace.lastSelectedId'
export const SELECTED_WORKSPACE_SCOPE_STORAGE_KEY =
  'carbonnt.workspace.lastSelectedScope'

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

export function getSelectedWorkspaceId() {
  return getLocalStorageItem(SELECTED_WORKSPACE_ID_STORAGE_KEY)
}

export function getSelectedWorkspaceScope() {
  return getLocalStorageItem(SELECTED_WORKSPACE_SCOPE_STORAGE_KEY)
}
