import type { WorkspaceApi } from '@carbonnt-cyacle/skeled-uicpub'
import { createWorkspaceAppApiService } from '@carbonnt-cyacle/skeled-uicpub'

import { queryClient } from './query-client'
import { setSessionScope } from './session-cookie'
import { vrpcClient } from './vrpc-client'

const workspaceAppApiService = createWorkspaceAppApiService(vrpcClient)
const getWorkspacesMeta = {
  serviceName: 'uic.WorkspaceAppApiService',
  methodName: 'getWorkspaces',
} as const

export type WorkspaceSelectionItem = WorkspaceApi

export const workspaceKeys = {
  list: () => [
    getWorkspacesMeta.serviceName,
    getWorkspacesMeta.methodName,
  ] as const,
}

export async function fetchAvailableWorkspaces() {
  return workspaceAppApiService.getWorkspaces(null, {
    suppressGlobalToast: true,
  })
}

export async function prepareWorkspaceSelectionAfterAuth() {
  setSessionScope('')
  queryClient.clear()

  const workspaces = await fetchAvailableWorkspaces()

  if (workspaces.length === 1) {
    const selectedWorkspace = await selectWorkspaceId(workspaces[0])

    return {
      requiresSelection: false,
      selectedWorkspaceId: selectedWorkspace.workspaceId,
      workspaces,
    }
  }

  return {
    requiresSelection: true,
    selectedWorkspaceId: null,
    workspaces,
  }
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
