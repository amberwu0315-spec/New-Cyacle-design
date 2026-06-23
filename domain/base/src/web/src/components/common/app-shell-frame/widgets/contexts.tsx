import * as React from 'react'

import type {
  AppShellFrameContextValue,
  AppShellFrameNavContextValue,
  AppShellFrameSidebarContextValue,
} from '../types'

export const AppShellFrameContext =
  React.createContext<AppShellFrameContextValue | null>(null)
export const AppShellFrameNavContext =
  React.createContext<AppShellFrameNavContextValue | null>(null)
export const AppShellFrameSidebarContext =
  React.createContext<AppShellFrameSidebarContextValue | null>(null)

export function useRequiredAppShellFrameContext(componentName: string) {
  const context = React.useContext(AppShellFrameContext)

  if (!context) {
    throw new Error(`${componentName} must be used inside AppShellFrame.`)
  }

  return context
}

export function useAppShellFrame() {
  return useRequiredAppShellFrameContext('useAppShellFrame')
}

export function useRequiredAppShellFrameNavContext(componentName: string) {
  const context = React.useContext(AppShellFrameNavContext)

  if (!context) {
    throw new Error(`${componentName} must be used inside AppShellFrame.Nav.`)
  }

  return context
}

export function useAppShellFrameNav() {
  return useRequiredAppShellFrameNavContext('useAppShellFrameNav')
}

export function useRequiredAppShellFrameSidebarContext(componentName: string) {
  const context = React.useContext(AppShellFrameSidebarContext)

  if (!context) {
    throw new Error(`${componentName} must be used inside AppShellFrame.Sidebar.`)
  }

  return context
}
