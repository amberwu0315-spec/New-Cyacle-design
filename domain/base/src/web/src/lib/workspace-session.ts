import { queryClient } from './query-client'
import { setSessionScope } from './session-cookie'

export type WorkspaceSelectionItem = {
  belongDisplayName?: string | null
  belongName?: string | null
  belongType?: string | null
  describe?: string | null
  id: string
  name: string
  scope: string
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

  return {
    workspaceId: normalizedWorkspaceId,
    scope: normalizedScope,
  }
}

export function clearWorkspaceSelectionSideEffects() {
  setSessionScope('')
  queryClient.clear()
}
