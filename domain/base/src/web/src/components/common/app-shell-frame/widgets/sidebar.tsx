import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover.tsx'
import { cn } from '#/lib/utils.ts'

import {
  AppShellFrameSidebarContext,
  useRequiredAppShellFrameContext,
  useRequiredAppShellFrameNavContext,
  useRequiredAppShellFrameSidebarContext,
} from './contexts'
import {
  resolveScenePickerLabel,
  shouldUseBrowserNavigation,
} from './nav-utils'
import {
  clampSidebarWidth,
  readStoredCollapsedGroups,
  readStoredSidebarWidth,
} from './storage-utils'
import type {
  AppShellFrameSidebarBrandProps,
  AppShellFrameSidebarContextValue,
  AppShellFrameSidebarNavProps,
  AppShellFrameSidebarProps,
} from '../types'

const DEFAULT_SIDEBAR_WIDTH_STORAGE_KEY = 'app:sidebar:width'
const DEFAULT_SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY =
  'app:sidebar:collapsed-groups'
const DEFAULT_SIDEBAR_WIDTH = 208
const DEFAULT_SIDEBAR_MIN_WIDTH = 176
const DEFAULT_SIDEBAR_MAX_WIDTH = 360
const SIDEBAR_LOGO_SWAP_DELAY_MS = 200
const SIDEBAR_TEXT_COLLAPSE_DELAY_MS = 200

const navActiveStyle =
  'border border-transparent bg-primary/[0.08] text-primary hover:bg-primary/[0.08] hover:text-primary active:bg-primary/[0.1] active:text-primary'
const navDefaultStyle =
  'border border-transparent text-sidebar-foreground/80 hover:bg-primary/[0.06] hover:text-sidebar-foreground active:bg-primary/[0.08] active:text-sidebar-foreground'

export function AppShellFrameSidebar({
  children,
  className,
  defaultWidth = DEFAULT_SIDEBAR_WIDTH,
  maxWidth = DEFAULT_SIDEBAR_MAX_WIDTH,
  minWidth = DEFAULT_SIDEBAR_MIN_WIDTH,
  resizeHint,
  resizeLabel,
  style,
  widthStorageKey = DEFAULT_SIDEBAR_WIDTH_STORAGE_KEY,
  ...props
}: AppShellFrameSidebarProps) {
  const {
    closeMobileSidebar,
    isMobile,
    isMobileSidebarOpen,
    sidebarState,
  } = useRequiredAppShellFrameContext('AppShellFrame.Sidebar')
  const isCollapsed = !isMobile && sidebarState === 'collapsed'
  const [isNavCompact, setIsNavCompact] = React.useState(isCollapsed)
  const [sidebarWidth, setSidebarWidth] = React.useState(() =>
    readStoredSidebarWidth({
      defaultWidth,
      maxWidth,
      minWidth,
      storageKey: widthStorageKey,
    }),
  )
  const [isResizing, setIsResizing] = React.useState(false)
  const resizeStartRef = React.useRef({
    pointerX: 0,
    width: defaultWidth,
  })

  const updateSidebarWidth = React.useCallback(
    (nextWidth: number) => {
      const clampedWidth = clampSidebarWidth(nextWidth, minWidth, maxWidth)
      setSidebarWidth(clampedWidth)
      window.localStorage.setItem(widthStorageKey, String(clampedWidth))
    },
    [maxWidth, minWidth, widthStorageKey],
  )

  const handleResizePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (isMobile || isCollapsed) {
        return
      }

      event.preventDefault()
      resizeStartRef.current = {
        pointerX: event.clientX,
        width: sidebarWidth,
      }
      setIsResizing(true)
    },
    [isCollapsed, isMobile, sidebarWidth],
  )

  const handleResizeDoubleClick = React.useCallback(() => {
    updateSidebarWidth(defaultWidth)
  }, [defaultWidth, updateSidebarWidth])

  const handleResizeKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        updateSidebarWidth(sidebarWidth - 12)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        updateSidebarWidth(sidebarWidth + 12)
      }
      if (event.key === 'Home') {
        event.preventDefault()
        updateSidebarWidth(minWidth)
      }
      if (event.key === 'End') {
        event.preventDefault()
        updateSidebarWidth(maxWidth)
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        updateSidebarWidth(defaultWidth)
      }
    },
    [defaultWidth, maxWidth, minWidth, sidebarWidth, updateSidebarWidth],
  )

  React.useEffect(() => {
    if (!isResizing) {
      return
    }

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    function handlePointerMove(event: PointerEvent) {
      const deltaX = event.clientX - resizeStartRef.current.pointerX
      updateSidebarWidth(resizeStartRef.current.width + deltaX)
    }

    function handlePointerUp() {
      setIsResizing(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [isResizing, updateSidebarWidth])

  React.useEffect(() => {
    if (!isCollapsed) {
      setIsNavCompact(false)
      return
    }

    const timer = window.setTimeout(() => {
      setIsNavCompact(true)
    }, SIDEBAR_TEXT_COLLAPSE_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isCollapsed])

  const sidebarContextValue = React.useMemo<AppShellFrameSidebarContextValue>(
    () => ({
      isCollapsed,
      isNavCompact,
    }),
    [isCollapsed, isNavCompact],
  )

  return (
    <AppShellFrameSidebarContext.Provider value={sidebarContextValue}>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-foreground/20 transition-opacity lg:hidden',
          isMobileSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={closeMobileSidebar}
      />

      <aside
        {...props}
        data-slot="app-shell-frame-sidebar"
        className={cn(
          'relative z-40 flex h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-10 after:w-3 after:bg-gradient-to-l after:from-border/50 after:via-border/20 after:to-transparent transition-[width,transform] duration-200 ease-linear',
          isResizing && 'transition-none',
          isMobile
            ? cn(
                'fixed inset-y-0 left-0 w-[18rem] shadow-xl lg:hidden',
                isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
              )
            : isCollapsed
              ? 'sticky top-0 w-[3.4rem]'
              : 'sticky top-0',
          className,
        )}
        style={
          !isMobile && !isCollapsed
            ? { ...style, width: `${sidebarWidth}px` }
            : style
        }
      >
        {children}

        {!isMobile && !isCollapsed ? (
          <button
            type="button"
            role="separator"
            aria-orientation="vertical"
            aria-label={resizeLabel}
            aria-valuemin={minWidth}
            aria-valuemax={maxWidth}
            aria-valuenow={sidebarWidth}
            title={resizeHint}
            className={cn(
              'absolute top-0 right-0 z-20 h-full w-2 cursor-col-resize touch-none outline-none',
              'before:absolute before:top-0 before:right-0 before:h-full before:w-px before:bg-transparent before:transition-colors',
              'hover:before:bg-primary/45 focus-visible:before:bg-primary/70',
              isResizing && 'before:bg-primary/70',
            )}
            onDoubleClick={handleResizeDoubleClick}
            onKeyDown={handleResizeKeyDown}
            onPointerDown={handleResizePointerDown}
          />
        ) : null}
      </aside>
    </AppShellFrameSidebarContext.Provider>
  )
}

export function AppShellFrameSidebarBrand({
  className,
  homeLabel,
  href = '/',
  label,
  logoAlt,
  logoSrc,
  onClick,
  onNavigate,
  ...props
}: AppShellFrameSidebarBrandProps) {
  const { closeMobileSidebar } = useRequiredAppShellFrameContext(
    'AppShellFrame.SidebarBrand',
  )
  const { isCollapsed } = useRequiredAppShellFrameSidebarContext(
    'AppShellFrame.SidebarBrand',
  )
  const [isLogoExpanded, setIsLogoExpanded] = React.useState(!isCollapsed)

  React.useEffect(() => {
    if (isCollapsed) {
      setIsLogoExpanded(false)
      return
    }

    const timer = window.setTimeout(() => {
      setIsLogoExpanded(true)
    }, SIDEBAR_LOGO_SWAP_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isCollapsed])

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event)

      if (shouldUseBrowserNavigation(event)) {
        return
      }

      event.preventDefault()
      closeMobileSidebar()
      onNavigate?.(href)
    },
    [closeMobileSidebar, href, onClick, onNavigate],
  )

  return (
    <div
      data-slot="app-shell-frame-sidebar-brand"
      className="h-14 overflow-hidden bg-sidebar p-0"
    >
      <a
        {...props}
        href={href}
        aria-label={homeLabel}
        title={homeLabel}
        className={cn(
          'flex h-full cursor-pointer items-center text-sidebar-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          isLogoExpanded ? 'w-full px-3' : 'w-[3.4rem] justify-center',
          className,
        )}
        onClick={handleClick}
      >
        {isLogoExpanded ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={logoSrc}
              alt=""
              aria-hidden="true"
              className="size-9 shrink-0 object-contain"
            />
            <span className="truncate text-[26px] leading-none font-semibold tracking-normal text-foreground">
              {label}
            </span>
          </div>
        ) : (
          <img
            src={logoSrc}
            alt={logoAlt ?? label}
            className="size-9 shrink-0 object-contain"
          />
        )}
      </a>
    </div>
  )
}

export function AppShellFrameSidebarNav({
  className,
  collapsedGroupsStorageKey = DEFAULT_SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY,
  labels,
  onNavigate,
  ...props
}: AppShellFrameSidebarNavProps) {
  const {
    closeMobileSidebar,
    closeScenePanel,
    isMobile,
    isScenePanelOpen,
    setScenePanelOpen,
  } = useRequiredAppShellFrameContext('AppShellFrame.SidebarNav')
  const { isCollapsed, isNavCompact } = useRequiredAppShellFrameSidebarContext(
    'AppShellFrame.SidebarNav',
  )
  const { activeItem, activeScene, categorizedScenes } =
    useRequiredAppShellFrameNavContext('AppShellFrame.SidebarNav')
  const [collapsedGroups, setCollapsedGroups] = React.useState(() =>
    readStoredCollapsedGroups(collapsedGroupsStorageKey),
  )
  const isCollapsedCompact = isCollapsed && isNavCompact

  const handleNavigate = React.useCallback(
    (to: string) => {
      closeScenePanel()
      closeMobileSidebar()
      onNavigate?.(to)
    },
    [closeMobileSidebar, closeScenePanel, onNavigate],
  )

  const toggleGroupCollapsed = React.useCallback(
    (groupId: string) => {
      setCollapsedGroups((currentGroups) => {
        const nextGroups = { ...currentGroups }
        if (nextGroups[groupId]) {
          delete nextGroups[groupId]
        } else {
          nextGroups[groupId] = true
        }
        window.localStorage.setItem(
          collapsedGroupsStorageKey,
          JSON.stringify(nextGroups),
        )
        return nextGroups
      })
    },
    [collapsedGroupsStorageKey],
  )

  const handleGroupToggleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const groupId = event.currentTarget.dataset.groupId
      if (!groupId) {
        return
      }

      toggleGroupCollapsed(groupId)
    },
    [toggleGroupCollapsed],
  )

  const handleNavLinkClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (shouldUseBrowserNavigation(event)) {
        return
      }

      const to = event.currentTarget.dataset.to
      if (!to) {
        return
      }

      event.preventDefault()
      handleNavigate(to)
    },
    [handleNavigate],
  )

  return (
    <div
      {...props}
      data-slot="app-shell-frame-sidebar-nav"
      className={cn('flex min-h-0 flex-1 flex-col', className)}
    >
      <div
        className={cn(
          'relative shrink-0 bg-sidebar px-3 pt-1 pb-1 transition-[padding] duration-200 ease-out',
          isNavCompact && 'px-0',
        )}
      >
        <Popover open={isScenePanelOpen} onOpenChange={setScenePanelOpen}>
          <PopoverTrigger
            aria-label={resolveScenePickerLabel(
              labels.scenePicker,
              activeScene,
            )}
            className={cn(
              'flex h-14 w-full cursor-pointer items-center justify-between overflow-hidden rounded-[8px] border border-sidebar-border bg-background px-2 text-sidebar-foreground shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-[width,height,padding,border-radius,background-color,color,border-color] duration-200 ease-out hover:bg-primary/[0.06] hover:text-primary',
              isNavCompact &&
                'mx-auto flex size-10 items-stretch justify-center p-0',
              isCollapsedCompact &&
                (isScenePanelOpen
                  ? '!border-primary/40 !bg-primary/[0.08] !text-primary hover:!bg-primary/[0.12]'
                  : '!border-primary/60 !bg-primary !text-primary-foreground hover:!bg-primary/90'),
              isCollapsed &&
                !isNavCompact &&
                !isScenePanelOpen &&
                '!border-primary/20 !bg-primary/[0.08] !text-primary hover:!bg-primary/[0.1]',
            )}
          >
            <span
              className={cn(
                'flex min-w-0 flex-1 items-center gap-3 overflow-hidden transition-[gap,padding] duration-200 ease-out',
                isNavCompact &&
                  'size-full min-w-0 flex-none items-stretch justify-center gap-0 pr-0',
              )}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary transition-[width,height,border-radius,background-color,color] duration-200 ease-out',
                  isNavCompact && 'size-full rounded-[inherit] bg-transparent',
                  isCollapsedCompact
                    ? isScenePanelOpen
                      ? 'text-primary'
                      : 'text-primary-foreground'
                    : 'text-primary',
                )}
              >
                <activeScene.icon className="size-5 shrink-0" />
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 overflow-hidden text-left',
                  isNavCompact && 'hidden',
                )}
              >
                <span
                  className={cn(
                    'block truncate whitespace-nowrap text-sm leading-5 font-semibold',
                    isCollapsedCompact
                      ? 'text-primary-foreground'
                      : 'text-primary',
                  )}
                >
                  {activeScene.label}
                </span>
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'ml-1 size-4 shrink-0 transition-transform',
                isScenePanelOpen && 'rotate-180',
                isCollapsedCompact ? 'text-primary-foreground' : 'text-primary',
                isNavCompact && 'hidden',
              )}
            />
          </PopoverTrigger>

          <PopoverContent
            side={isCollapsed ? 'right' : 'bottom'}
            align="start"
            sideOffset={isCollapsed ? 10 : 8}
            className={cn(
              'border border-border/50 p-6 shadow-xl',
              isCollapsed
                ? 'w-fit max-w-[calc(100vw-6rem)]'
                : isMobile
                  ? 'w-[calc(100vw-2.75rem)] max-w-[20rem]'
                  : 'w-fit max-w-[calc(100vw-2.75rem)]',
            )}
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-flow-col md:auto-cols-[19rem] md:grid-cols-none">
              {categorizedScenes.map((category) => (
                <section
                  key={category.title}
                  className="flex min-w-0 flex-col gap-4"
                >
                  <div className="px-1 text-xs font-semibold tracking-wide text-muted-foreground">
                    {category.title}
                  </div>
                  <div className="flex flex-col gap-3">
                    {category.scenes.map((scene) => {
                      const isCurrent = scene.id === activeScene.id

                      return (
                        <a
                          key={scene.id}
                          href={scene.defaultTo}
                          data-to={scene.defaultTo}
                          className={cn(
                            'group relative flex min-h-24 w-full cursor-pointer items-start gap-3.5 rounded-lg border border-border bg-card px-4 py-3.5 text-left transition-colors duration-200',
                            isCurrent
                              ? 'border-primary/30 bg-primary/[0.06]'
                              : 'hover:bg-primary/[0.06] active:bg-primary/[0.08]',
                          )}
                          onClick={handleNavLinkClick}
                        >
                          <span
                            className={cn(
                              'flex size-10 shrink-0 items-center justify-center rounded bg-transparent transition-colors',
                              isCurrent
                                ? 'text-primary'
                                : 'text-muted-foreground/70',
                            )}
                          >
                            <scene.icon className="size-5 shrink-0" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              title={scene.label}
                              className={cn(
                                'block line-clamp-2 text-sm leading-5 font-semibold break-words',
                                isCurrent ? 'text-primary' : 'text-foreground',
                              )}
                            >
                              {scene.label}
                            </span>
                            <span
                              title={scene.description}
                              className={cn(
                                'mt-1 block line-clamp-2 text-xs leading-5 break-words',
                                isCurrent
                                  ? 'text-primary/80'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {scene.description}
                            </span>
                          </span>
                        </a>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div
        className={cn(
          'flex-1 overflow-y-auto bg-sidebar pt-1.5 pb-2',
          isCollapsed && 'pt-1',
        )}
      >
        <div className="flex flex-col">
          {activeScene.groups.map((group) => {
            const isGroupCollapsed =
              !isCollapsed && collapsedGroups[group.id] === true
            const activeGroupItem = group.items.find(
              (item) => item.id === activeItem?.id,
            )
            const hasActiveGroupItem = activeGroupItem !== undefined
            const shouldHighlightGroupTitle =
              isGroupCollapsed && hasActiveGroupItem

            return (
              <section
                key={group.id}
                className={cn(
                  'px-3',
                  group.title ? 'py-0' : 'py-1.5',
                  isCollapsed && 'py-1.5',
                )}
              >
                {group.title ? (
                  <button
                    type="button"
                    data-group-id={group.id}
                    aria-expanded={!isGroupCollapsed}
                    title={activeGroupItem?.label}
                    className={cn(
                      'my-1 flex h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 text-left text-xs font-semibold tracking-[0.08em] text-muted-foreground/70 transition-colors hover:bg-primary/[0.06] hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      shouldHighlightGroupTitle &&
                        'bg-primary/[0.08] text-primary hover:bg-primary/[0.08] hover:text-primary',
                      isCollapsed &&
                        'my-0 h-0 min-h-0 overflow-hidden px-0 opacity-0',
                    )}
                    onClick={handleGroupToggleClick}
                  >
                    <span className={cn('truncate', isCollapsed && 'hidden')}>
                      {group.title}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        'size-3 shrink-0 transition-transform',
                        isGroupCollapsed && '-rotate-90',
                        isCollapsed && 'hidden',
                      )}
                    />
                  </button>
                ) : null}

                <div
                  className={cn(
                    'flex flex-col gap-1',
                    isCollapsed && 'items-center',
                    isGroupCollapsed && 'hidden',
                  )}
                >
                  {group.items.map((item) => {
                    const isActive = activeItem?.id === item.id

                    return (
                      <a
                        key={item.id}
                        href={item.to}
                        data-to={item.to}
                        title={item.label}
                        className={cn(
                          isActive ? navActiveStyle : navDefaultStyle,
                          'flex h-8 w-full items-center gap-2 rounded-md border px-2 text-left text-sm transition-colors',
                          isCollapsed && 'size-8 justify-center gap-0 p-2',
                        )}
                        onClick={handleNavLinkClick}
                      >
                        <item.icon className="size-4 shrink-0" />
                        <span
                          className={cn(
                            'truncate whitespace-nowrap',
                            isCollapsed && 'hidden',
                          )}
                        >
                          {item.label}
                        </span>
                      </a>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
