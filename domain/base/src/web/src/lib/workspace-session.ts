import type { WorkspaceApi } from '@carbonnt-cyacle/skeled-uicpub'
import { createWorkspaceAppApiService } from '@carbonnt-cyacle/skeled-uicpub'

import { queryClient } from './query-client'
import {
  setSessionScope,
  setSessionWorkspaceId,
} from './session-cookie'
import { vrpcClient } from './vrpc-client'

const workspaceAppApiService = createWorkspaceAppApiService(vrpcClient)
const getWorkspacesMeta = {
  serviceName: 'uic.WorkspaceAppApiService',
  methodName: 'getWorkspaces',
} as const
const switchWorkspaceMeta = {
  serviceName: 'uic.WorkspaceAppApiService',
  methodName: 'switchWorkspace',
} as const

export type WorkspaceSelectionItem = WorkspaceApi

export const workspaceKeys = {
  list: () => [
    getWorkspacesMeta.serviceName,
    getWorkspacesMeta.methodName,
  ] as const,
  switch: (workspaceId: string) => [
    switchWorkspaceMeta.serviceName,
    switchWorkspaceMeta.methodName,
    workspaceId,
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
    const selectedWorkspace = await selectWorkspaceId(workspaces[0].id)

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

export async function selectWorkspaceId(workspaceId: string) {
  const normalizedWorkspaceId = workspaceId.trim()

  if (!normalizedWorkspaceId) {
    throw new Error('workspaceId is required')
  }

  const result = await workspaceAppApiService.switchWorkspace(
    { workspaceId: normalizedWorkspaceId },
    { suppressGlobalToast: true },
  )
  const normalizedScope = result.scope.trim()

  if (!normalizedScope) {
    throw new Error('workspace scope is empty')
  }

  setSessionScope(normalizedScope)
  setSessionWorkspaceId(normalizedWorkspaceId)
  queryClient.clear()

  return {
    workspaceId: normalizedWorkspaceId,
    scope: normalizedScope,
  }
}

export function clearWorkspaceSelectionSideEffects() {
  setSessionScope('')
  queryClient.clear()
}
