import * as React from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'
import {
  AppLayout as BaseAppLayout,
  clearAuthSessionSideEffects,
  clearWorkspaceSelectionSideEffects,
  createAppNavConfig,
  getSessionCredential,
  useLanguageStore,
} from '@carbonnt-cyacle/web-base'
import {
  useAvailableWorkspaces,
  useCurrentUserProfile,
} from '@carbonnt-cyacle/web-uic'

import { webModules } from '#/vineModules.gen.ts'

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

  const handleLogout = React.useCallback(() => {
    clearAuthSessionSideEffects()
    clearWorkspaceSelectionSideEffects()
    void navigate({ to: '/uic/login' })
  }, [navigate])

  return (
    <BaseAppLayout
      hasSessionCredential={hasSessionCredential}
      navConfig={navConfig}
      onLogout={handleLogout}
      profileQuery={profileQuery}
      workspaceQuery={workspaceQuery}
    >
      <Outlet />
    </BaseAppLayout>
  )
}
