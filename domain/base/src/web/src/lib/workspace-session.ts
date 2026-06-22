import type { WorkspaceApi } from '@carbonnt-cyacle/skeled-uicpub'
import { createWorkspaceAppApiService } from '@carbonnt-cyacle/skeled-uicpub'

import { queryClient } from '#/lib/query-client.tsx'
import {
  setSessionScope,
  setSessionWorkspaceId,
} from '#/lib/session-cookie.ts'
import { vrpcClient } from '#/lib/vrpc-client.ts'

const workspaceAppApiService = createWorkspaceAppApiService(vrpcClient)
const REMEMBERED_WORKSPACE_ID_STORAGE_KEY = 'carbonnt.workspace.lastSelectedId'

const getWorkspacesMeta = {
  serviceName: 'uic.WorkspaceAppApiService',
  methodName: 'getWorkspaces',
} as const

const switchWorkspaceMeta = {
  serviceName: 'uic.WorkspaceAppApiService',
  methodName: 'switchWorkspace',
} as const

export type WorkspaceSelectionItem = WorkspaceApi & {
  scope: string
}

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

function normalizeWorkspaceSelectionItem(
  workspace: WorkspaceApi,
): WorkspaceSelectionItem {
  const workspaceWithScope = workspace as WorkspaceApi & {
    scope?: unknown
  }

  return {
    ...workspace,
    scope:
      typeof workspaceWithScope.scope === 'string'
        ? workspaceWithScope.scope
        : '',
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

export async function fetchAvailableWorkspaces() {
  const workspaces = await workspaceAppApiService.getWorkspaces(null, {
    suppressGlobalToast: true,
  })

  return workspaces.map(normalizeWorkspaceSelectionItem)
}

export async function prepareWorkspaceSelectionAfterAuth() {
  setSessionScope('')
  queryClient.clear()

  const workspaces = await fetchAvailableWorkspaces()
  const workspaceToSelect =
    getRememberedWorkspaceSelection(workspaces) ??
    (workspaces.length === 1 ? workspaces[0] : null)

  if (workspaceToSelect) {
    const selectedWorkspace = await selectWorkspaceId(workspaceToSelect)

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

export async function selectWorkspaceId(
  workspaceOrId: WorkspaceSelectionItem | string,
) {
  const normalizedWorkspaceId =
    typeof workspaceOrId === 'string'
      ? workspaceOrId.trim()
      : workspaceOrId.id.trim()
  let normalizedScope =
    typeof workspaceOrId === 'string' ? '' : workspaceOrId.scope.trim()

  if (!normalizedWorkspaceId) {
    throw new Error('workspaceId is required')
  }

  if (!normalizedScope) {
    const result = await workspaceAppApiService.switchWorkspace(
      { workspaceId: normalizedWorkspaceId },
      { suppressGlobalToast: true },
    )

    normalizedScope = result.scope.trim()
  }

  if (!normalizedScope) {
    throw new Error('workspace scope is empty')
  }

  setSessionScope(normalizedScope)
  setSessionWorkspaceId(normalizedWorkspaceId)
  setRememberedWorkspaceId(normalizedWorkspaceId)
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
