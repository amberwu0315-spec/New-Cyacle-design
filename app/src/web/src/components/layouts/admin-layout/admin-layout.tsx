import type { ReactNode } from 'react'
import { Navigate, useNavigate } from '@tanstack/react-router'

import {
  AccountPopover,
  AdminLayout,
  clearAuthSessionSideEffects,
  getSessionCredential,
  getWebProjectConfig,
} from '@carbonnt-cyacle/web-base'
import { Spinner } from '@carbonnt-cyacle/web-base'
import {
  AuthGuard,
  ForbiddenError,
  PermissionGuardProvider,
  clearWorkspaceSelectionSideEffects,
  getSelectedWorkspaceScope,
  selectWorkspaceId,
  useAvailableWorkspaces,
  useCurrentOrganizationProfile,
  useCurrentUserProfile,
  usePermissionGuardContext,
} from '@carbonnt-cyacle/web-uic/pub'

import {
  adminPermissionCodes,
  getAdminNavigation,
} from '#/admin/admin-config.ts'
import { useTranslation } from '#/lib/i18n/index.ts'
import { resolveSystemEntryAccess } from '#/system-entry.ts'

function AdminBrand() {
  const { t: messages } = useTranslation()

  return (
    <div
      className="flex items-center gap-3"
      aria-label={messages.layout.admin.brandAriaLabel}
    >
      <span className="grid size-8 grid-cols-2 gap-[3px] rounded-[3px] bg-[#116ab6] p-[5px] shadow-[0_1px_2px_rgba(17,70,120,0.22)]">
        <span className="rounded-[1px] bg-white" />
        <span className="rounded-[1px] bg-white/45" />
        <span className="rounded-[1px] bg-white/45" />
        <span className="rounded-[1px] bg-white" />
      </span>
      <span
        data-slot="admin-brand-label"
        className="text-[28px] font-semibold leading-none tracking-[-0.035em] text-[#11151b]"
      >
        Admin
      </span>
    </div>
  )
}

export function AdminAppLayout() {
  return (
    <AuthGuard>
      <AdminBusinessGuard>
        <PermissionGuardProvider codes={adminPermissionCodes}>
          <PermissionAwareAdminLayout />
        </PermissionGuardProvider>
      </AdminBusinessGuard>
    </AuthGuard>
  )
}

function AdminBusinessGuard({ children }: { children: ReactNode }) {
  const currentWorkspaceScope = getSelectedWorkspaceScope()
  const organizationProfileQuery = useCurrentOrganizationProfile({
    enabled: Boolean(currentWorkspaceScope),
    workspaceScope: currentWorkspaceScope,
  })

  if (!currentWorkspaceScope) {
    return <Navigate to="/" replace />
  }

  if (
    organizationProfileQuery.isLoading ||
    (organizationProfileQuery.isFetching && !organizationProfileQuery.data)
  ) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner className="size-5" />
      </div>
    )
  }

  const access = resolveSystemEntryAccess(
    organizationProfileQuery.data?.businessCodes,
  )

  if (organizationProfileQuery.isError || !access.canOpenAdmin) {
    return <ForbiddenError />
  }

  return children
}

function PermissionAwareAdminLayout() {
  const { hasPermission, isLoading } = usePermissionGuardContext()
  const adminNavigation = getAdminNavigation('zh-CN')
  const navigation = adminNavigation.flatMap((group) => {
    const items = group.items.filter(
      (item) => !item.permissionCode || hasPermission(item.permissionCode),
    )

    return items.length > 0 ? [{ ...group, items }] : []
  })

  return (
    <AdminLayout
      brand={<AdminBrand />}
      navigation={isLoading ? [] : navigation}
      sidebarFooter={<AdminAccountActions />}
    />
  )
}

function AdminAccountActions() {
  const navigate = useNavigate()
  const hasSessionCredential = Boolean(getSessionCredential())
  const currentWorkspaceScope = getSelectedWorkspaceScope()
  const profileQuery = useCurrentUserProfile({
    enabled: hasSessionCredential,
  })
  const workspaceQuery = useAvailableWorkspaces({
    enabled: hasSessionCredential,
  })

  const handleLogout = () => {
    clearAuthSessionSideEffects()
    clearWorkspaceSelectionSideEffects()
    void navigate({ to: getWebProjectConfig().routes.loginPath })
  }

  return (
    <AccountPopover
      currentWorkspaceScope={currentWorkspaceScope}
      hasSessionCredential={hasSessionCredential}
      onLogout={handleLogout}
      onWorkspaceSelect={selectWorkspaceId}
      profileQuery={profileQuery}
      workspaceQuery={workspaceQuery}
    />
  )
}
