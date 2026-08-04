import * as React from 'react'
import { Navigate, Outlet, useNavigate } from '@tanstack/react-router'
import {
  AppLayout as BaseAppLayout,
  AgentCollaborationRoot,
  AssistantAgentUserContextProvider,
  clearAuthSessionSideEffects,
  getSessionCredential,
  type AppLayoutAccountMenuLink,
  type AssistantAgentUserContext,
  type AppLayoutUserProfile,
  useLanguageStore,
  getWebProjectConfig,
} from '@carbonnt-cyacle/web-base'
import {
  AuthGuard,
  clearWorkspaceSelectionSideEffects,
  getSelectedWorkspaceId,
  getSelectedWorkspaceScope,
  getWorkspaceAutoSelection,
  selectWorkspaceId,
  useAvailableWorkspaces,
  useCurrentOrganizationProfile,
  useCurrentUserProfile,
} from '@carbonnt-cyacle/web-uic/pub'

import { webModules } from '#/vineModules.gen.ts'
import { getAppEdition } from '#/app-edition.ts'
import { resolveSystemEntryAccess } from '#/system-entry.ts'
import { createConfiguredAppNavConfig } from './app-nav-config.ts'

type AgentProfile = AppLayoutUserProfile & {
  id?: number | string | null
  organizationId?: string | null
}

export function AppLayout() {
  const navigate = useNavigate()
  const language = useLanguageStore()
  const hasSessionCredential = Boolean(getSessionCredential())
  const appEdition = getAppEdition()
  const profileQuery = useCurrentUserProfile({
    enabled: hasSessionCredential,
  })
  const workspaceQuery = useAvailableWorkspaces({
    enabled: hasSessionCredential,
  })
  const currentWorkspaceScope = getSelectedWorkspaceScope()
  const selectedWorkspaceId = getSelectedWorkspaceId()
  const organizationProfileQuery = useCurrentOrganizationProfile({
    enabled: hasSessionCredential && Boolean(currentWorkspaceScope),
    workspaceScope: currentWorkspaceScope,
  })
  const currentWorkspace = React.useMemo(
    () =>
      workspaceQuery.data?.find(
        (workspace) => workspace.id === selectedWorkspaceId,
      ) ??
      workspaceQuery.data?.find(
        (workspace) => workspace.scope.trim() === currentWorkspaceScope,
      ) ??
      null,
    [currentWorkspaceScope, selectedWorkspaceId, workspaceQuery.data],
  )
  const navConfig = React.useMemo(
    () =>
      createConfiguredAppNavConfig(
        webModules,
        { language, workspace: currentWorkspace },
        appEdition,
      ),
    [appEdition, currentWorkspace, language],
  )
  const systemEntryAccess = resolveSystemEntryAccess(
    organizationProfileQuery.data?.businessCodes,
  )
  const accountMenuLinks = React.useMemo<Array<AppLayoutAccountMenuLink>>(
    () =>
      systemEntryAccess.showAdminLink
        ? [
            {
              href: '/admin',
              id: 'open-admin',
              label:
                language === 'en-US'
                  ? 'Open admin management'
                  : '进入后台管理',
              target: '_blank',
            },
          ]
        : [],
    [language, systemEntryAccess.showAdminLink],
  )
  const assistantUserContext = React.useMemo<AssistantAgentUserContext>(() => {
    const profile = profileQuery.data as AgentProfile | null | undefined
    const organizationId =
      currentWorkspace?.belongType === 'ORGANIZATION'
        ? currentWorkspace.belongId
        : profile?.organizationId

    return {
      operatorId: profile?.id == null ? null : String(profile.id),
      workspaceId: selectedWorkspaceId,
      organizationId,
    }
  }, [currentWorkspace, profileQuery.data, selectedWorkspaceId])

  const handleLogout = React.useCallback(() => {
    clearAuthSessionSideEffects()
    clearWorkspaceSelectionSideEffects()
    void navigate({ to: getWebProjectConfig().routes.loginPath })
  }, [navigate])

  if (
    organizationProfileQuery.isSuccess &&
    systemEntryAccess.defaultEntry === 'admin'
  ) {
    return <Navigate to="/admin" replace />
  }

  return (
    <AuthGuard>
      <AssistantAgentUserContextProvider value={assistantUserContext}>
        <BaseAppLayout
          accountMenuLinks={accountMenuLinks}
          currentWorkspaceScope={currentWorkspaceScope}
          getWorkspaceAutoSelection={getWorkspaceAutoSelection}
          hasSessionCredential={hasSessionCredential}
          navConfig={navConfig}
          onLogout={handleLogout}
          onWorkspaceSelect={selectWorkspaceId}
          profileQuery={profileQuery}
          workspaceQuery={workspaceQuery}
        >
          <Outlet />
        </BaseAppLayout>
        <AgentCollaborationRoot />
      </AssistantAgentUserContextProvider>
    </AuthGuard>
  )
}
