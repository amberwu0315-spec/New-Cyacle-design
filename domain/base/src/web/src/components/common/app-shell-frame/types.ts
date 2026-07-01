import type * as React from 'react'

export type AppShellSidebarState = 'expanded' | 'collapsed'
export type AppShellIcon = React.ElementType<{ className?: string }>

export interface AppShellNavItem {
  id: string
  label: string
  description: string
  to: string
  icon: AppShellIcon
}

export interface AppShellNavGroup {
  id: string
  title: string | null
  items: Array<AppShellNavItem>
}

export interface AppShellScene {
  id: string
  label: string
  description: string
  category: string
  icon: AppShellIcon
  defaultTo: string
  groups: Array<AppShellNavGroup>
}

export interface AppShellSceneCategory {
  title: string
  sceneIds: Array<string>
}

export interface AppShellNavConfig {
  scenes: Array<AppShellScene>
  categories: Array<AppShellSceneCategory>
  defaultSceneId: string
}

export interface AppShellBreadcrumbItem {
  label: React.ReactNode
  href?: string | null
}

export interface AppShellFrameNavContextValue {
  activeItem: AppShellNavItem | null
  activeScene: AppShellScene
  categorizedScenes: Array<{
    title: string
    scenes: Array<AppShellScene>
  }>
  navConfig: AppShellNavConfig
  pathname: string
}

export interface AppShellFrameContextValue {
  closeMobileSidebar: () => void
  closeScenePanel: () => void
  isMobile: boolean
  isMobileSidebarOpen: boolean
  isScenePanelOpen: boolean
  isSidebarOpen: boolean
  setScenePanelOpen: (open: boolean) => void
  sidebarState: AppShellSidebarState
  toggleSidebar: () => void
}

export interface AppShellFrameRootProps
  extends Omit<React.ComponentPropsWithoutRef<'div'>, 'children'> {
  children: React.ReactNode
  defaultSidebarOpen?: boolean
  enableSidebarShortcut?: boolean
  mobileMediaQuery?: string
  onSidebarOpenChange?: (open: boolean) => void
  routeKey?: string | number
  sidebarCookieExpiresDays?: number
  sidebarCookieName?: string | null
  sidebarOpen?: boolean
}

export type AppShellFrameProps = AppShellFrameRootProps

export type AppShellFrameBodyProps = React.ComponentPropsWithoutRef<'div'>

export type AppShellFrameContentProps = React.ComponentPropsWithoutRef<'div'>

export type AppShellFrameMainProps = React.ComponentPropsWithoutRef<'main'>
export interface AppShellFrameNavProps {
  children: React.ReactNode
  navConfig: AppShellNavConfig
  pathname: string
}

export type AppShellFrameOverlaysProps = React.ComponentPropsWithoutRef<'div'>

export interface AppShellFrameSidebarProps
  extends React.ComponentPropsWithoutRef<'aside'> {
  defaultWidth?: number
  maxWidth?: number
  minWidth?: number
  resizeHint?: string
  resizeLabel?: string
  widthStorageKey?: string
}

export interface AppShellFrameSidebarBrandProps
  extends Omit<React.ComponentPropsWithoutRef<'a'>, 'children'> {
  homeLabel: string
  label: string
  logoAlt?: string
  logoSrc: string
  onNavigate?: (to: string) => void
}

export interface AppShellFrameSidebarNavLabels {
  scenePicker: string | ((scene: AppShellScene) => string)
}

export interface AppShellFrameSidebarNavProps
  extends React.ComponentPropsWithoutRef<'div'> {
  collapsedGroupsStorageKey?: string
  labels: AppShellFrameSidebarNavLabels
  onNavigate?: (to: string) => void
}

export type AppShellFrameTopbarProps = React.ComponentPropsWithoutRef<'header'>

export interface AppShellFrameSidebarTriggerLabels {
  collapse: string
  expand: string
  open: string
}

export interface AppShellFrameSidebarTriggerProps
  extends Omit<React.ComponentPropsWithoutRef<'button'>, 'children'> {
  icon?: AppShellIcon
  labels: AppShellFrameSidebarTriggerLabels
}

export interface AppShellFrameBreadcrumbsProps
  extends React.ComponentPropsWithoutRef<'div'> {
  items?: Array<AppShellBreadcrumbItem>
  onNavigate?: (to: string) => void
}

export type AppShellFrameTopbarEndProps = React.ComponentPropsWithoutRef<'div'>
export type AppShellFrameTopbarStartProps = React.ComponentPropsWithoutRef<'div'>

export interface AppShellFrameSidebarContextValue {
  isCollapsed: boolean
  isNavCompact: boolean
}
