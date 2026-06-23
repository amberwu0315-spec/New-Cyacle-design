import * as React from 'react'

import { cn } from '#/lib/utils.ts'

import {
  AppShellFrameContext,
  AppShellFrameNavContext,
  useRequiredAppShellFrameContext,
} from './contexts'
import { getActiveNavMatch, getCategorizedScenes } from './nav-utils'
import {
  getInitialIsMobile,
  readStoredSidebarOpen,
  writeStoredSidebarOpen,
} from './storage-utils'
import type {
  AppShellFrameBodyProps,
  AppShellFrameContentProps,
  AppShellFrameContextValue,
  AppShellFrameMainProps,
  AppShellFrameNavContextValue,
  AppShellFrameNavProps,
  AppShellFrameOverlaysProps,
  AppShellFrameRootProps,
  AppShellSidebarState,
} from '../types'

const DEFAULT_MOBILE_MEDIA_QUERY = '(max-width: 1023px)'
const DEFAULT_SIDEBAR_COOKIE_NAME = 'sidebar_open'
const DEFAULT_SIDEBAR_COOKIE_EXPIRES_DAYS = 7

export function AppShellFrameRoot({
  children,
  className,
  defaultSidebarOpen = true,
  enableSidebarShortcut = true,
  mobileMediaQuery = DEFAULT_MOBILE_MEDIA_QUERY,
  onSidebarOpenChange,
  routeKey,
  sidebarCookieExpiresDays = DEFAULT_SIDEBAR_COOKIE_EXPIRES_DAYS,
  sidebarCookieName = DEFAULT_SIDEBAR_COOKIE_NAME,
  sidebarOpen: controlledSidebarOpen,
  ...props
}: AppShellFrameRootProps) {
  const [isMobile, setIsMobile] = React.useState(() =>
    getInitialIsMobile(mobileMediaQuery),
  )
  const [uncontrolledSidebarOpen, setUncontrolledSidebarOpen] =
    React.useState(() =>
      readStoredSidebarOpen(sidebarCookieName, defaultSidebarOpen),
    )
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false)
  const [isScenePanelOpen, setIsScenePanelOpen] = React.useState(false)
  const isSidebarOpen = controlledSidebarOpen ?? uncontrolledSidebarOpen

  const closeMobileSidebar = React.useCallback(() => {
    setIsMobileSidebarOpen(false)
  }, [])

  const closeScenePanel = React.useCallback(() => {
    setIsScenePanelOpen(false)
  }, [])

  const setSidebarOpen = React.useCallback(
    (getNext: (current: boolean) => boolean) => {
      if (controlledSidebarOpen !== undefined) {
        const next = getNext(controlledSidebarOpen)

        writeStoredSidebarOpen(
          sidebarCookieName,
          sidebarCookieExpiresDays,
          next,
        )
        onSidebarOpenChange?.(next)
        return
      }

      setUncontrolledSidebarOpen((current) => {
        const next = getNext(current)

        writeStoredSidebarOpen(
          sidebarCookieName,
          sidebarCookieExpiresDays,
          next,
        )
        onSidebarOpenChange?.(next)
        return next
      })
    },
    [
      controlledSidebarOpen,
      onSidebarOpenChange,
      sidebarCookieExpiresDays,
      sidebarCookieName,
    ],
  )

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setIsMobileSidebarOpen((current) => !current)
      return
    }

    setSidebarOpen((current) => !current)
  }, [isMobile, setSidebarOpen])

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(mobileMediaQuery)

    function handleMediaQueryChange(event: MediaQueryListEvent) {
      setIsMobile(event.matches)
    }

    setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleMediaQueryChange)

    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange)
    }
  }, [mobileMediaQuery])

  React.useEffect(() => {
    setIsMobileSidebarOpen(false)
    setIsScenePanelOpen(false)
  }, [routeKey])

  React.useEffect(() => {
    if (!enableSidebarShortcut) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'b' || (!event.metaKey && !event.ctrlKey)) {
        return
      }

      event.preventDefault()

      if (window.matchMedia(mobileMediaQuery).matches) {
        setIsMobileSidebarOpen((current) => !current)
        return
      }

      setSidebarOpen((current) => !current)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enableSidebarShortcut, mobileMediaQuery, setSidebarOpen])

  const sidebarState: AppShellSidebarState = isSidebarOpen
    ? 'expanded'
    : 'collapsed'
  const contextValue = React.useMemo<AppShellFrameContextValue>(
    () => ({
      closeMobileSidebar,
      closeScenePanel,
      isMobile,
      isMobileSidebarOpen,
      isScenePanelOpen,
      isSidebarOpen,
      setScenePanelOpen: setIsScenePanelOpen,
      sidebarState,
      toggleSidebar,
    }),
    [
      closeMobileSidebar,
      closeScenePanel,
      isMobile,
      isMobileSidebarOpen,
      isScenePanelOpen,
      isSidebarOpen,
      sidebarState,
      toggleSidebar,
    ],
  )

  return (
    <AppShellFrameContext.Provider value={contextValue}>
      <div
        {...props}
        data-sidebar-state={sidebarState}
        data-slot="app-shell-frame"
        className={cn(
          'h-dvh overflow-hidden bg-background text-foreground',
          className,
        )}
      >
        {children}
      </div>
    </AppShellFrameContext.Provider>
  )
}

export function AppShellFrameBody({
  children,
  className,
  ...props
}: AppShellFrameBodyProps) {
  useRequiredAppShellFrameContext('AppShellFrame.Body')

  return (
    <div
      {...props}
      data-slot="app-shell-frame-body"
      className={cn('flex h-full min-h-0 w-full', className)}
    >
      {children}
    </div>
  )
}

export function AppShellFrameContent({
  children,
  className,
  ...props
}: AppShellFrameContentProps) {
  useRequiredAppShellFrameContext('AppShellFrame.Content')

  return (
    <div
      {...props}
      data-slot="app-shell-frame-content"
      className={cn(
        'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AppShellFrameMain({
  children,
  className,
  ...props
}: AppShellFrameMainProps) {
  useRequiredAppShellFrameContext('AppShellFrame.Main')

  return (
    <main
      {...props}
      data-slot="app-shell-frame-main"
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-auto bg-background',
        className,
      )}
    >
      {children}
    </main>
  )
}

export function AppShellFrameNav({
  children,
  navConfig,
  pathname,
}: AppShellFrameNavProps) {
  useRequiredAppShellFrameContext('AppShellFrame.Nav')
  const { activeItem, activeScene } = React.useMemo(
    () => getActiveNavMatch(navConfig, pathname),
    [navConfig, pathname],
  )
  const categorizedScenes = React.useMemo(
    () => getCategorizedScenes(navConfig),
    [navConfig],
  )
  const contextValue = React.useMemo<AppShellFrameNavContextValue>(
    () => ({
      activeItem,
      activeScene,
      categorizedScenes,
      navConfig,
      pathname,
    }),
    [activeItem, activeScene, categorizedScenes, navConfig, pathname],
  )

  return (
    <AppShellFrameNavContext.Provider value={contextValue}>
      {children}
    </AppShellFrameNavContext.Provider>
  )
}

export function AppShellFrameOverlays({
  children,
  className,
  ...props
}: AppShellFrameOverlaysProps) {
  useRequiredAppShellFrameContext('AppShellFrame.Overlays')

  return (
    <div
      {...props}
      data-slot="app-shell-frame-overlays"
      className={className}
    >
      {children}
    </div>
  )
}
