import * as React from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import Cookies from 'js-cookie'
import { AlertTriangleIcon, LogOutIcon, RefreshCwIcon } from 'lucide-react'

import { AppSidebar } from './app-sidebar'
import { AppTopbar } from './app-topbar'
import { WorkspaceSelectionDialog } from './workspace-selection-dialog'
import {
  getActiveNavItem,
  getActiveScene,
  getBreadcrumbItems,
} from './nav-matching'
import type { AppNavConfig } from './nav-config'
import { Button } from '../../ui/button'
import { Spinner } from '../../ui/spinner'
import { clearAuthSessionSideEffects } from '../../../lib/auth-session'
import { crossDomainRoutePaths } from '../../../lib/cross-domain-route-paths'
import { useTranslation } from '../../../lib/i18n'
import {
  getSessionCredential,
  getSessionScope,
} from '../../../lib/session-cookie'
import { selectWorkspaceId } from '../../../lib/workspace-session'
import { useAvailableWorkspaces, useCurrentUserProfile } from './queries'
import type { WorkspaceSelectionItem } from '../../../lib/workspace-session'

const SIDEBAR_COOKIE_NAME = 'sidebar_state'
const MOBILE_MEDIA_QUERY = '(max-width: 1023px)'

type SidebarState = 'expanded' | 'collapsed'

function getCookieSidebarState() {
  return Cookies.get(SIDEBAR_COOKIE_NAME) !== 'false'
}

function getInitialIsMobile() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
}

function persistSidebarState(isOpen: boolean) {
  Cookies.set(SIDEBAR_COOKIE_NAME, String(isOpen), {
    path: '/',
    expires: 7,
    sameSite: 'lax',
  })
}

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
  navConfig,
}: {
  children: React.ReactNode
  navConfig: AppNavConfig
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const [isMobile, setIsMobile] = React.useState(getInitialIsMobile)
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(
    getCookieSidebarState,
  )
  const [selectedWorkspaceScope, setSelectedWorkspaceScope] = React.useState(
    () => getSessionScope()?.trim() || null,
  )
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = React.useState<
    string | null
  >(null)
  const [lastAvailableWorkspaces, setLastAvailableWorkspaces] = React.useState<
    Array<WorkspaceSelectionItem>
  >([])
  const [workspaceSwitchFailed, setWorkspaceSwitchFailed] = React.useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false)
  const [isScenePanelOpen, setIsScenePanelOpen] = React.useState(false)
  const hasSessionCredential = Boolean(getSessionCredential())
  const {
    data: currentUserProfile,
    isError: isProfileError,
    isFetching: isProfileFetching,
    isSuccess: isProfileSuccess,
    refetch: refetchProfile,
  } = useCurrentUserProfile({
    enabled: hasSessionCredential,
  })
  const hasCurrentUserProfile = Boolean(currentUserProfile)
  const {
    data: availableWorkspaces,
    isError: isWorkspaceError,
    isFetching: isWorkspaceFetching,
    isLoading: isWorkspaceLoading,
    isSuccess: isWorkspaceSuccess,
    refetch: refetchWorkspaces,
  } = useAvailableWorkspaces({
    enabled: hasSessionCredential,
  })
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
  const workspaceSelectionOptions = React.useMemo(() => {
    if (availableWorkspaces?.length) {
      return availableWorkspaces
    }

    if (switchingWorkspaceId && lastAvailableWorkspaces.length) {
      return lastAvailableWorkspaces
    }

    return availableWorkspaces ?? []
  }, [availableWorkspaces, lastAvailableWorkspaces, switchingWorkspaceId])

  const setPersistedSidebarOpen = React.useCallback((getNext: (current: boolean) => boolean) => {
    setIsSidebarOpen((current) => {
      const next = getNext(current)
      persistSidebarState(next)
      return next
    })
  }, [])

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)

    function handleMediaQueryChange(event: MediaQueryListEvent) {
      setIsMobile(event.matches)
    }

    setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleMediaQueryChange)

    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange)
    }
  }, [])

  React.useEffect(() => {
    setIsMobileSidebarOpen(false)
    setIsScenePanelOpen(false)
  }, [pathname])

  React.useEffect(() => {
    if (availableWorkspaces?.length) {
      setLastAvailableWorkspaces(availableWorkspaces)
    }
  }, [availableWorkspaces])

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'b' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
          setIsMobileSidebarOpen((current) => !current)
          return
        }

        setPersistedSidebarOpen((current) => !current)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [setPersistedSidebarOpen])

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setIsMobileSidebarOpen((current) => !current)
      return
    }

    setPersistedSidebarOpen((current) => !current)
  }, [isMobile, setPersistedSidebarOpen])

  const handleWorkspaceSelect = React.useCallback(
    async (workspace: WorkspaceSelectionItem) => {
      if (switchingWorkspaceId) {
        return
      }

      setWorkspaceSwitchFailed(false)
      setSwitchingWorkspaceId(workspace.id)

      try {
        const result = await selectWorkspaceId(workspace)
        setSelectedWorkspaceScope(result.scope)
        window.location.reload()
      } catch (error) {
        console.error('Failed to switch workspace:', error)
        setWorkspaceSwitchFailed(true)
      } finally {
        setSwitchingWorkspaceId(null)
      }
    },
    [switchingWorkspaceId],
  )

  const handleWorkspaceRetry = React.useCallback(() => {
    setWorkspaceSwitchFailed(false)
    void refetchWorkspaces()
  }, [refetchWorkspaces])

  const handleProfileRetry = React.useCallback(() => {
    void refetchProfile()
  }, [refetchProfile])

  const handleProfileLogout = React.useCallback(() => {
    clearAuthSessionSideEffects()
    void navigate({ to: crossDomainRoutePaths.uic.login })
  }, [navigate])

  React.useEffect(() => {
    if (
      !shouldRequireWorkspaceSelection ||
      availableWorkspaces?.length !== 1
    ) {
      return
    }

    const [workspace] = availableWorkspaces
    let ignore = false

    async function selectSingleWorkspace() {
      setWorkspaceSwitchFailed(false)
      setSwitchingWorkspaceId(workspace.id)

      try {
        const result = await selectWorkspaceId(workspace)

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

    void selectSingleWorkspace()

    return () => {
      ignore = true
    }
  }, [availableWorkspaces, shouldRequireWorkspaceSelection])

  const sidebarState: SidebarState = isSidebarOpen ? 'expanded' : 'collapsed'
  const activeScene = React.useMemo(
    () => getActiveScene(navConfig, pathname),
    [navConfig, pathname],
  )
  const activeItem = React.useMemo(
    () => getActiveNavItem(navConfig, pathname),
    [navConfig, pathname],
  )
  const breadcrumbItems = React.useMemo(
    () => getBreadcrumbItems(navConfig, pathname, sidebarState),
    [navConfig, pathname, sidebarState],
  )

  const isProfileBootstrapError =
    !hasCurrentUserProfile && (isProfileError || isProfileSuccess)

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="flex h-full min-h-0 w-full">
        <AppSidebar
          activeItem={activeItem}
          activeScene={activeScene}
          navConfig={navConfig}
          isMobile={isMobile}
          isMobileOpen={isMobileSidebarOpen}
          isScenePanelOpen={isScenePanelOpen}
          sidebarState={sidebarState}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onScenePanelOpenChange={setIsScenePanelOpen}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AppTopbar
            activeItem={activeItem}
            activeScene={activeScene}
            breadcrumbItems={breadcrumbItems}
            isMobile={isMobile}
            sidebarState={sidebarState}
            onToggleSidebar={toggleSidebar}
          />

          <main className="flex min-h-0 flex-1 flex-col overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>

      <WorkspaceSelectionDialog
        open={shouldRequireWorkspaceSelection}
        currentWorkspaceScope={selectedWorkspaceScope}
        workspaces={workspaceSelectionOptions}
        isLoading={
          isWorkspaceLoading ||
          (isWorkspaceFetching && !availableWorkspaces?.length) ||
          (Boolean(switchingWorkspaceId) && !workspaceSelectionOptions.length)
        }
        isError={isWorkspaceError}
        isSwitchError={workspaceSwitchFailed}
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
          onLogout={handleProfileLogout}
        />
      ) : null}
    </div>
  )
}
