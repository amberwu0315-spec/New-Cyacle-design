import * as React from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'
import {
  AppLayout as BaseAppLayout,
  AgentCollaborationRoot,
  AssistantAgentUserContextProvider,
  clearAuthSessionSideEffects,
  createAppNavConfig,
  getSessionCredential,
  getSessionWorkspaceId,
  type AssistantAgentUserContext,
  type AppLayoutUserProfile,
  useLanguageStore,
} from '@carbonnt-cyacle/web-base'
import {
  useAvailableWorkspaces,
  useCurrentUserProfile,
} from '@carbonnt-cyacle/web-uic'

import { webModules } from '#/vineModules.gen.ts'

type AgentProfile = AppLayoutUserProfile & {
  id?: number | string | null
  organizationId?: string | null
}

export function AppLayout() {
  const navigate = useNavigate()
  const language = useLanguageStore()
  const hasSessionCredential = Boolean(getSessionCredential())
  const navConfig = React.useMemo(
    () => createAppNavConfig(webModules, { language }),
    [language],
  )
  const profileQuery = useCurrentUserProfile({
    enabled: hasSessionCredential,
  })
  const workspaceQuery = useAvailableWorkspaces({
    enabled: hasSessionCredential,
  })
  const assistantUserContext = React.useMemo<AssistantAgentUserContext>(() => {
    const profile = profileQuery.data as AgentProfile | null | undefined
    const workspaceId = getSessionWorkspaceId()
    const currentWorkspace = workspaceQuery.data?.find(
      (workspace) => workspace.id === workspaceId,
    )
    const organizationId =
      currentWorkspace?.belongType === 'ORGANIZATION'
        ? currentWorkspace.belongId
        : profile?.organizationId

    return {
      operatorId: profile?.id == null ? null : String(profile.id),
      workspaceId,
      organizationId,
    }
  }, [profileQuery.data, workspaceQuery.data])

  const handleLogout = React.useCallback(() => {
    clearAuthSessionSideEffects()
    void navigate({ to: '/uic/login' })
  }, [navigate])

  return (
    <AssistantAgentUserContextProvider value={assistantUserContext}>
      <BaseAppLayout
        hasSessionCredential={hasSessionCredential}
        navConfig={navConfig}
        onLogout={handleLogout}
        profileQuery={profileQuery}
        workspaceQuery={workspaceQuery}
      >
        <Outlet />
      </BaseAppLayout>
      <AgentCollaborationRoot />
    </AssistantAgentUserContextProvider>
  )
}
