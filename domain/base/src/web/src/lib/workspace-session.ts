import { queryClient } from '#/lib/query-client.tsx'
import { setSessionScope } from '#/lib/session-cookie.ts'

const REMEMBERED_WORKSPACE_ID_STORAGE_KEY = 'carbonnt.workspace.lastSelectedId'

export type WorkspaceSelectionItem = {
  belongDisplayName?: string | null
  belongName?: string | null
  belongType?: string | null
  describe?: string | null
  id: string
  name: string
  scope: string
}

function getRememberedWorkspaceId() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(REMEMBERED_WORKSPACE_ID_STORAGE_KEY)?.trim() || null
  } catch {
    return null
  }
}

function setRememberedWorkspaceId(workspaceId: string) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(REMEMBERED_WORKSPACE_ID_STORAGE_KEY, workspaceId)
  } catch {
    // localStorage can be unavailable in private or restricted contexts.
  }
}

export function getRememberedWorkspaceSelection(
  workspaces: Array<WorkspaceSelectionItem>,
) {
  const rememberedWorkspaceId = getRememberedWorkspaceId()

  if (!rememberedWorkspaceId) {
    return null
  }

  return (
    workspaces.find(
      (workspace) => workspace.id.trim() === rememberedWorkspaceId,
    ) ?? null
  )
}

export async function selectWorkspaceId(workspace: WorkspaceSelectionItem) {
  const normalizedWorkspaceId = workspace.id.trim()
  const normalizedScope =
    typeof workspace.scope === 'string' ? workspace.scope.trim() : ''

  if (!normalizedWorkspaceId) {
    throw new Error('workspaceId is required')
  }

  if (!normalizedScope) {
    throw new Error('workspace scope is empty')
  }

  setSessionScope(normalizedScope)
  setRememberedWorkspaceId(normalizedWorkspaceId)

  return {
    workspaceId: normalizedWorkspaceId,
    scope: normalizedScope,
  }
}

export function clearWorkspaceSelectionSideEffects() {
  setSessionScope('')
  queryClient.clear()
}
