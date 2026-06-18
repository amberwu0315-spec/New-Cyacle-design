import * as React from 'react'
import { ChevronRight, Menu } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { useTranslation } from '#/lib/i18n/index.ts'
import { cn } from '#/lib/utils.ts'

import { AccountPopover } from '#/components/layouts/app-layout/account-popover.tsx'
import type {
  AppLayoutAsyncState,
  AppLayoutUserProfile,
} from '#/components/layouts/app-layout/app-layout.tsx'
import type { BreadcrumbItem } from '#/components/layouts/app-layout/nav-matching.ts'
import type { AppNavItem, AppScene } from '#/components/layouts/app-layout/nav-config.tsx'
import type { WorkspaceSelectionItem } from '#/lib/workspace-session.ts'

interface AppTopbarProps {
  activeItem: AppNavItem | null
  activeScene: AppScene
  breadcrumbItems: Array<BreadcrumbItem>
  hasSessionCredential: boolean
  isMobile: boolean
  onLogout: () => void
  sidebarState: 'expanded' | 'collapsed'
  onToggleSidebar: () => void
  profileQuery: AppLayoutAsyncState<AppLayoutUserProfile>
  workspaceQuery: AppLayoutAsyncState<Array<WorkspaceSelectionItem>>
}

export function AppTopbar({
  activeItem,
  activeScene,
  breadcrumbItems,
  hasSessionCredential,
  isMobile,
  onLogout,
  sidebarState,
  onToggleSidebar,
  profileQuery,
  workspaceQuery,
}: AppTopbarProps) {
  const { t } = useTranslation()
  const [isSidebarIconHovered, setIsSidebarIconHovered] = React.useState(false)
  const SidebarIcon =
    isSidebarIconHovered || isMobile
      ? Menu
      : (activeItem?.icon ?? activeScene.icon)
  const sidebarButtonLabel = isMobile
    ? t.common.shell.topbar.openSidebar
    : sidebarState === 'collapsed'
      ? t.common.shell.topbar.expandSidebar
      : t.common.shell.topbar.collapseSidebar

  const handleSidebarIconMouseEnter = React.useCallback(() => {
    setIsSidebarIconHovered(true)
  }, [])

  const handleSidebarIconMouseLeave = React.useCallback(() => {
    setIsSidebarIconHovered(false)
  }, [])

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={sidebarButtonLabel}
          className="shrink-0 bg-primary/10 text-primary hover:bg-primary/[0.14] hover:text-primary active:translate-y-0"
          onClick={onToggleSidebar}
          onMouseEnter={handleSidebarIconMouseEnter}
          onMouseLeave={handleSidebarIconMouseLeave}
        >
          <SidebarIcon aria-hidden="true" />
        </Button>

        <div className="flex min-w-0 items-center gap-2 overflow-hidden text-base font-medium">
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1

            return (
              <React.Fragment key={`${item.label}-${index}`}>
                {index > 0 ? (
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                ) : null}
                <span
                  className={cn(
                    'truncate',
                    isLast
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </span>
              </React.Fragment>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="pl-1">
          <AccountPopover
            hasSessionCredential={hasSessionCredential}
            onLogout={onLogout}
            profileQuery={profileQuery}
            workspaceQuery={workspaceQuery}
          />
        </div>
      </div>
    </header>
  )
}
