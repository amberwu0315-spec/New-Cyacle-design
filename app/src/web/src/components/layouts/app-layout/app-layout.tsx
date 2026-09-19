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
  useCurrentPermissions,
  useCurrentUserProfile,
} from '@carbonnt-cyacle/web-uic/pub'

import { webModules } from '#/generated/modules.gen.ts'
import { getAppEdition } from '#/app-edition.ts'
import { resolveSystemEntryAccess } from '#/system-entry.ts'
import { useTranslation } from '#/lib/i18n/index.ts'
import { createConfiguredAppNavConfig } from './app-nav-config.ts'
import { appPermissionCodes } from '#/app-permissions.ts'

type AgentProfile = AppLayoutUserProfile & {
  id?: number | string | null
  organizationId?: string | null
}

export function AppLayout() {
  const navigate = useNavigate()
  const language = useLanguageStore()
  const { t } = useTranslation()
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
      (() => {
        const workspace =
          workspaceQuery.data?.find(
            (item) => item.id === selectedWorkspaceId,
          ) ??
          workspaceQuery.data?.find(
            (item) => item.scope.trim() === currentWorkspaceScope,
          ) ??
          null

        return workspace
          ? {
              ...workspace,
              organizationCategory: organizationProfileQuery.data?.category,
            }
          : null
      })(),
    [
      currentWorkspaceScope,
      organizationProfileQuery.data?.category,
      selectedWorkspaceId,
      workspaceQuery.data,
    ],
  )
  const permissionQuery = useCurrentPermissions({
    codes: appPermissionCodes,
    enabled:
      hasSessionCredential &&
      Boolean(profileQuery.data) &&
      Boolean(currentWorkspaceScope),
    workspaceScope: currentWorkspaceScope,
  })
  const navConfig = React.useMemo(
    () =>
      createConfiguredAppNavConfig(
        webModules,
        {
          language,
          permissionCodeMap: permissionQuery.data ?? {},
          workspace: currentWorkspace,
        },
        appEdition,
      ),
    [appEdition, currentWorkspace, language, permissionQuery.data],
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
              label: t.layout.account.openAdmin,
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
    void navigate({
      to: getWebProjectConfig().routes.loginPath,
      replace: true,
    })
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
          permissionQuery={permissionQuery}
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
