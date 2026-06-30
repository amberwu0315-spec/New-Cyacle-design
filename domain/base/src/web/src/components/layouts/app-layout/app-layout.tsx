import * as React from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { AlertTriangleIcon, LogOutIcon, RefreshCwIcon } from 'lucide-react'

import { AppShellFrame } from '#/components/common/app-shell-frame/index.ts'
import type { AppShellBreadcrumbItem } from '#/components/common/app-shell-frame/index.ts'
import { AccountPopover } from '#/components/layouts/app-layout/account-popover.tsx'
import { AppLayoutBreadcrumbsProvider } from './breadcrumbs.tsx'
import { WorkspaceSelectionDialog } from './workspace-selection-dialog.tsx'
import type { AppNavConfig } from './nav-config.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'
import { formatMessage, useTranslation } from '#/lib/i18n/index.ts'
import type {
  WorkspaceAutoSelectionResolver,
  WorkspaceSelectionItem,
  WorkspaceSelectionResult,
} from './workspace-selection.ts'
import cyacleLogo from './assets/brand/cyacle.png'

type SessionBootstrapErrorProps = {
  actionHint: string
  description: string
  isRetrying: boolean
  logoutLabel: string
  onLogout: () => void
  onRetry: () => void
  retryLabel: string
  title: string
}

export type AppLayoutAsyncState<TData> = {
  data: TData | null | undefined
  isError: boolean
  isFetching: boolean
  isLoading?: boolean
  isSuccess: boolean
  refetch: () => unknown
}

export type AppLayoutUserProfile = {
  email?: string | null
  phone?: string | null
  realName?: string | null
  username?: string | null
}

export interface AppLayoutProps {
  children: React.ReactNode
  currentWorkspaceScope?: string | null
  getWorkspaceAutoSelection: WorkspaceAutoSelectionResolver
  hasSessionCredential: boolean
  navConfig: AppNavConfig
  onLogout: () => void
  onWorkspaceSelect: (
    workspace: WorkspaceSelectionItem,
  ) => Promise<WorkspaceSelectionResult>
  profileQuery: AppLayoutAsyncState<AppLayoutUserProfile>
  workspaceQuery: AppLayoutAsyncState<Array<WorkspaceSelectionItem>>
}

function SessionBootstrapError({
  actionHint,
  description,
  isRetrying,
  logoutLabel,
  onLogout,
  onRetry,
  retryLabel,
  title,
}: SessionBootstrapErrorProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 px-6 text-foreground backdrop-blur-sm"
    >
      <section className="flex w-full max-w-[520px] flex-col items-center text-center">
        <div className="flex size-11 items-center justify-center rounded-lg border border-destructive/15 bg-destructive/5 text-destructive shadow-sm">
          <AlertTriangleIcon aria-hidden="true" className="size-5" />
        </div>
        <h1 className="mt-5 text-[22px] leading-8 font-semibold tracking-normal text-foreground">
          {title}
        </h1>
        <p className="mt-2 max-w-[460px] text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
          {actionHint}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Button size="lg" onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? (
              <Spinner className="size-4" />
            ) : (
              <RefreshCwIcon aria-hidden="true" className="size-4" />
            )}
            <span>{retryLabel}</span>
          </Button>
          <Button size="lg" variant="outline" onClick={onLogout}>
            <LogOutIcon aria-hidden="true" className="size-4" />
            <span>{logoutLabel}</span>
          </Button>
        </div>
      </section>
    </div>
  )
}

export function AppLayout({
  children,
  currentWorkspaceScope,
  getWorkspaceAutoSelection,
  hasSessionCredential,
  navConfig,
  onLogout,
  onWorkspaceSelect,
  profileQuery,
  workspaceQuery,
}: AppLayoutProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const [breadcrumbItems, setBreadcrumbItems] = React.useState<
    Array<AppShellBreadcrumbItem> | null
  >(null)
  const breadcrumbsContextValue = React.useMemo(
    () => ({ setBreadcrumbItems }),
    [],
  )
  const [selectedWorkspaceScope, setSelectedWorkspaceScope] = React.useState(
    () => currentWorkspaceScope?.trim() || null,
  )
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = React.useState<
    string | null
  >(null)
  const [lastAvailableWorkspaces, setLastAvailableWorkspaces] = React.useState<
    Array<WorkspaceSelectionItem>
  >([])
  const [workspaceSwitchFailed, setWorkspaceSwitchFailed] = React.useState(false)
  const {
    data: currentUserProfile,
    isError: isProfileError,
    isFetching: isProfileFetching,
    isSuccess: isProfileSuccess,
    refetch: refetchProfile,
  } = profileQuery
  const hasCurrentUserProfile = Boolean(currentUserProfile)
  const {
    data: availableWorkspaces,
    isError: isWorkspaceError,
    isFetching: isWorkspaceFetching,
    isLoading: isWorkspaceLoading,
    isSuccess: isWorkspaceSuccess,
    refetch: refetchWorkspaces,
  } = workspaceQuery
  const isSelectedWorkspaceValid = React.useMemo(() => {
    if (!selectedWorkspaceScope || !availableWorkspaces) {
      return false
    }

    return availableWorkspaces.some(
      (workspace) => workspace.scope.trim() === selectedWorkspaceScope,
    )
  }, [availableWorkspaces, selectedWorkspaceScope])
  const shouldRequireWorkspaceSelection =
    hasSessionCredential &&
    isWorkspaceSuccess &&
    (!selectedWorkspaceScope || !isSelectedWorkspaceValid)
  const autoSelectedWorkspace = React.useMemo(() => {
    if (!availableWorkspaces?.length) {
      return null
    }

    return getWorkspaceAutoSelection(availableWorkspaces)
  }, [availableWorkspaces, getWorkspaceAutoSelection])
  const shouldOpenWorkspaceSelectionDialog =
    shouldRequireWorkspaceSelection &&
    (workspaceSwitchFailed || !autoSelectedWorkspace)
  const workspaceSelectionOptions = React.useMemo(() => {
    if (availableWorkspaces?.length) {
      return availableWorkspaces
    }

    if (switchingWorkspaceId && lastAvailableWorkspaces.length) {
      return lastAvailableWorkspaces
    }

    return availableWorkspaces ?? []
  }, [availableWorkspaces, lastAvailableWorkspaces, switchingWorkspaceId])

  React.useEffect(() => {
    if (availableWorkspaces?.length) {
      setLastAvailableWorkspaces(availableWorkspaces)
    }
  }, [availableWorkspaces])

  React.useEffect(() => {
    setSelectedWorkspaceScope(currentWorkspaceScope?.trim() || null)
  }, [currentWorkspaceScope])

  const handleWorkspaceSelect = React.useCallback(
    async (workspace: WorkspaceSelectionItem) => {
      if (switchingWorkspaceId) {
        return
      }

      setWorkspaceSwitchFailed(false)
      setSwitchingWorkspaceId(workspace.id)

      try {
        const result = await onWorkspaceSelect(workspace)
        setSelectedWorkspaceScope(result.scope)
        window.location.reload()
      } catch (error) {
        console.error('Failed to switch workspace:', error)
        setWorkspaceSwitchFailed(true)
      } finally {
        setSwitchingWorkspaceId(null)
      }
    },
    [onWorkspaceSelect, switchingWorkspaceId],
  )

  const handleWorkspaceRetry = React.useCallback(() => {
    setWorkspaceSwitchFailed(false)
    void refetchWorkspaces()
  }, [refetchWorkspaces])

  const handleProfileRetry = React.useCallback(() => {
    void refetchProfile()
  }, [refetchProfile])

  const handleNavigate = React.useCallback(
    (to: string) => {
      void navigate({ to })
    },
    [navigate],
  )

  React.useEffect(() => {
    if (!shouldRequireWorkspaceSelection || !autoSelectedWorkspace) {
      return
    }

    const workspace = autoSelectedWorkspace
    let ignore = false

    async function selectAutoWorkspace() {
      setWorkspaceSwitchFailed(false)
      setSwitchingWorkspaceId(workspace.id)

      try {
        const result = await onWorkspaceSelect(workspace)

        if (!ignore) {
          setSelectedWorkspaceScope(result.scope)
          window.location.reload()
        }
      } catch (error) {
        console.error('Failed to switch workspace:', error)

        if (!ignore) {
          setWorkspaceSwitchFailed(true)
        }
      } finally {
        if (!ignore) {
          setSwitchingWorkspaceId(null)
        }
      }
    }

    void selectAutoWorkspace()

    return () => {
      ignore = true
    }
  }, [autoSelectedWorkspace, onWorkspaceSelect, shouldRequireWorkspaceSelection])

  const isProfileBootstrapError =
    !hasCurrentUserProfile && (isProfileError || isProfileSuccess)

  return (
    <AppLayoutBreadcrumbsProvider value={breadcrumbsContextValue}>
      <AppShellFrame routeKey={pathname}>
        <AppShellFrame.Nav navConfig={navConfig} pathname={pathname}>
          <AppShellFrame.Body>
            <AppShellFrame.Sidebar
              resizeLabel={t.common.shell.sidebar.resizeLabel}
              resizeHint={t.common.shell.sidebar.resizeHint}
            >
              <AppShellFrame.SidebarBrand
                href="/"
                label={t.common.shell.sidebar.brandName}
                homeLabel={t.common.shell.sidebar.homeLink}
                logoSrc={cyacleLogo}
                onNavigate={handleNavigate}
              />
              <AppShellFrame.SidebarNav
                labels={{
                  scenePicker: (scene) =>
                    formatMessage(t.common.shell.sidebar.scenePickerLabel, {
                      label: scene.label,
                    }),
                }}
                onNavigate={handleNavigate}
              />
            </AppShellFrame.Sidebar>

            <AppShellFrame.Content>
              <AppShellFrame.Topbar>
                <AppShellFrame.TopbarStart>
                  <AppShellFrame.SidebarTrigger
                    labels={{
                      open: t.common.shell.topbar.openSidebar,
                      expand: t.common.shell.topbar.expandSidebar,
                      collapse: t.common.shell.topbar.collapseSidebar,
                    }}
                  />
                  <AppShellFrame.Breadcrumbs
                    items={breadcrumbItems ?? undefined}
                  />
                </AppShellFrame.TopbarStart>

                <AppShellFrame.TopbarEnd>
                  <AccountPopover
                    currentWorkspaceScope={selectedWorkspaceScope}
                    hasSessionCredential={hasSessionCredential}
                    onLogout={onLogout}
                    onWorkspaceSelect={onWorkspaceSelect}
                    profileQuery={profileQuery}
                    workspaceQuery={workspaceQuery}
                  />
                </AppShellFrame.TopbarEnd>
              </AppShellFrame.Topbar>

              <AppShellFrame.Main>{children}</AppShellFrame.Main>
            </AppShellFrame.Content>
          </AppShellFrame.Body>
        </AppShellFrame.Nav>

        <AppShellFrame.Overlays>
          <WorkspaceSelectionDialog
            open={shouldOpenWorkspaceSelectionDialog}
            currentWorkspaceScope={selectedWorkspaceScope}
            workspaces={workspaceSelectionOptions}
            isLoading={
              isWorkspaceLoading ||
              (isWorkspaceFetching && !availableWorkspaces?.length) ||
              (Boolean(switchingWorkspaceId) && !workspaceSelectionOptions.length)
            }
            isError={isWorkspaceError}
            isSwitchError={workspaceSwitchFailed}
            onLogout={onLogout}
            onRetry={handleWorkspaceRetry}
            onSelect={handleWorkspaceSelect}
            switchingWorkspaceId={switchingWorkspaceId}
          />

          {isProfileBootstrapError ? (
            <SessionBootstrapError
              title={t.common.shell.profileBootstrap.errorTitle}
              description={t.common.shell.profileBootstrap.errorDescription}
              actionHint={t.common.shell.profileBootstrap.actionHint}
              retryLabel={t.common.shell.profileBootstrap.retry}
              logoutLabel={t.common.shell.profileBootstrap.logout}
              isRetrying={isProfileFetching}
              onRetry={handleProfileRetry}
              onLogout={onLogout}
            />
          ) : null}
        </AppShellFrame.Overlays>
      </AppShellFrame>
    </AppLayoutBreadcrumbsProvider>
  )
}
