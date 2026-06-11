import * as React from 'react'
import { useLocation } from '@tanstack/react-router'
import Cookies from 'js-cookie'

import { AppSidebar } from './app-sidebar'
import { AppTopbar } from './app-topbar'
import {
  getActiveNavItem,
  getActiveScene,
  getBreadcrumbItems,
} from './nav-matching'
import type { AppNavConfig } from './nav-config'

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

export function AppLayout({
  children,
  navConfig,
}: {
  children: React.ReactNode
  navConfig: AppNavConfig
}) {
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const [isMobile, setIsMobile] = React.useState(getInitialIsMobile)
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(
    getCookieSidebarState,
  )
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false)
  const [isScenePanelOpen, setIsScenePanelOpen] = React.useState(false)

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
    </div>
  )
}
