import * as React from 'react'
import { ChevronRight, Menu } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { cn } from '#/lib/utils.ts'

import {
  AppShellFrameNavContext,
  useRequiredAppShellFrameContext,
  useRequiredAppShellFrameNavContext,
} from './contexts'
import { getBreadcrumbItems, shouldUseBrowserNavigation } from './nav-utils'
import type {
  AppShellFrameBreadcrumbsProps,
  AppShellFrameSidebarTriggerProps,
  AppShellFrameTopbarEndProps,
  AppShellFrameTopbarProps,
  AppShellFrameTopbarStartProps,
} from '../types'

export function AppShellFrameTopbar({
  children,
  className,
  ...props
}: AppShellFrameTopbarProps) {
  useRequiredAppShellFrameContext('AppShellFrame.Topbar')

  return (
    <header
      {...props}
      data-slot="app-shell-frame-topbar"
      className={cn(
        'flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4',
        className,
      )}
    >
      {children}
    </header>
  )
}

export function AppShellFrameTopbarStart({
  children,
  className,
  ...props
}: AppShellFrameTopbarStartProps) {
  useRequiredAppShellFrameContext('AppShellFrame.TopbarStart')

  return (
    <div
      {...props}
      data-slot="app-shell-frame-topbar-start"
      className={cn('flex min-w-0 items-center gap-3', className)}
    >
      {children}
    </div>
  )
}

export function AppShellFrameSidebarTrigger({
  className,
  icon: Icon,
  labels,
  onClick,
  onMouseEnter,
  onMouseLeave,
  ...props
}: AppShellFrameSidebarTriggerProps) {
  const { isMobile, sidebarState, toggleSidebar } =
    useRequiredAppShellFrameContext('AppShellFrame.SidebarTrigger')
  const navContext = React.useContext(AppShellFrameNavContext)
  const [isHovered, setIsHovered] = React.useState(false)
  const ActiveIcon =
    Icon ?? navContext?.activeItem?.icon ?? navContext?.activeScene.icon ?? Menu
  const TriggerIcon =
    isHovered || isMobile ? Menu : ActiveIcon
  const label = isMobile
    ? labels.open
    : sidebarState === 'collapsed'
      ? labels.expand
      : labels.collapse

  const handleMouseEnter = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(true)
      onMouseEnter?.(event)
    },
    [onMouseEnter],
  )

  const handleMouseLeave = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(false)
      onMouseLeave?.(event)
    },
    [onMouseLeave],
  )

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)

      if (event.defaultPrevented) {
        return
      }

      toggleSidebar()
    },
    [onClick, toggleSidebar],
  )

  return (
    <Button
      {...props}
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      className={cn(
        'shrink-0 bg-primary/10 text-primary hover:bg-primary/[0.14] hover:text-primary active:translate-y-0',
        className,
      )}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <TriggerIcon aria-hidden="true" />
    </Button>
  )
}

export function AppShellFrameBreadcrumbs({
  className,
  items,
  onNavigate,
  ...props
}: AppShellFrameBreadcrumbsProps) {
  const { sidebarState } = useRequiredAppShellFrameContext(
    'AppShellFrame.Breadcrumbs',
  )
  const { activeItem, activeScene } = useRequiredAppShellFrameNavContext(
    'AppShellFrame.Breadcrumbs',
  )
  const breadcrumbItems = React.useMemo(
    () => items ?? getBreadcrumbItems(activeScene, activeItem, sidebarState),
    [activeItem, activeScene, items, sidebarState],
  )

  return (
    <div
      {...props}
      data-slot="app-shell-frame-breadcrumbs"
      className={cn(
        'flex min-w-0 items-center gap-2 overflow-hidden text-base font-medium',
        className,
      )}
    >
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1
        const href = item.href?.trim()
        const itemClassName = cn(
          'truncate',
          isLast ? 'font-semibold text-foreground' : 'text-muted-foreground',
        )
        const content = href ? (
          <a
            href={href}
            className={cn(
              itemClassName,
              'rounded-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
            )}
            onClick={(event) => {
              if (shouldUseBrowserNavigation(event)) {
                return
              }

              if (!onNavigate) {
                return
              }

              event.preventDefault()
              onNavigate(href)
            }}
          >
            {item.label}
          </a>
        ) : (
          <span className={itemClassName}>{item.label}</span>
        )

        return (
          <React.Fragment key={`${String(item.label)}-${index}`}>
            {index > 0 ? (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            ) : null}
            {content}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export function AppShellFrameTopbarEnd({
  children,
  className,
  ...props
}: AppShellFrameTopbarEndProps) {
  useRequiredAppShellFrameContext('AppShellFrame.TopbarEnd')

  return (
    <div
      {...props}
      data-slot="app-shell-frame-topbar-end"
      className={cn('flex items-center gap-2', className)}
    >
      {children}
    </div>
  )
}
