import * as React from 'react'
import { ChevronDown, ChevronsLeft, ChevronsRight } from 'lucide-react'

import { cn } from '#/lib/utils.ts'

export type WorkbenchSidebarIcon = React.ElementType<{ className?: string }>

export interface WorkbenchSidebarItemSelectPayload {
  id: string
}

export interface WorkbenchSidebarLabels {
  collapse?: string
  expand?: string
  navigation?: string
}

export interface WorkbenchSidebarRootProps
  extends Omit<React.ComponentPropsWithoutRef<'aside'>, 'onSelect'> {
  activeItemId?: string | null
  collapsedWidth?: number | string
  defaultExpanded?: boolean
  expanded?: boolean
  expandedWidth?: number | string
  labels?: WorkbenchSidebarLabels
  onExpandedChange?: (expanded: boolean) => void
  onItemSelect?: (payload: WorkbenchSidebarItemSelectPayload) => void
  showEdgeToggle?: boolean
  storageKey?: string
}

export interface WorkbenchSidebarContentProps
  extends React.ComponentPropsWithoutRef<'nav'> {
  scrollMaskClassName?: string
}

export interface WorkbenchSidebarGroupProps
  extends Omit<React.ComponentPropsWithoutRef<'section'>, 'title'> {
  collapsed?: boolean
  collapsible?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  title?: React.ReactNode
}

export interface WorkbenchSidebarUngroupedProps
  extends React.ComponentPropsWithoutRef<'section'> {
  separated?: boolean
}

export type WorkbenchSidebarBottomProps = React.ComponentPropsWithoutRef<'div'>

export type WorkbenchSidebarFooterProps = React.ComponentPropsWithoutRef<'div'>

export interface WorkbenchSidebarItemProps
  extends Omit<React.ComponentPropsWithoutRef<'button'>, 'children' | 'onSelect'> {
  active?: boolean
  compactLabel?: React.ReactNode
  icon: WorkbenchSidebarIcon
  id: string
  onSelect?: (payload: WorkbenchSidebarItemSelectPayload) => void
  children: React.ReactNode
}

interface WorkbenchSidebarContextValue {
  activeItemId: string | null
  expanded: boolean
  labels: Required<WorkbenchSidebarLabels>
  onExpandedChange: (expanded: boolean) => void
  onItemSelect?: (payload: WorkbenchSidebarItemSelectPayload) => void
}

interface ScrollEdges {
  top: boolean
  bottom: boolean
}

const DEFAULT_LABELS: Required<WorkbenchSidebarLabels> = {
  collapse: '收起菜单',
  expand: '展开菜单',
  navigation: '工作区菜单',
}
const DEFAULT_EXPANDED_WIDTH = '12rem'
const DEFAULT_COLLAPSED_WIDTH = '5rem'
const EDGE_TOGGLE_HOVER_DELAY_MS = 120
const SCROLL_EDGE_THRESHOLD = 1
const SCROLLBAR_HIDE_DELAY_MS = 900

const WorkbenchSidebarContext =
  React.createContext<WorkbenchSidebarContextValue | null>(null)

function useRequiredWorkbenchSidebarContext(componentName: string) {
  const context = React.useContext(WorkbenchSidebarContext)

  if (!context) {
    throw new Error(`${componentName} must be used inside WorkbenchSidebar.`)
  }

  return context
}

export function useWorkbenchSidebar() {
  return useRequiredWorkbenchSidebarContext('useWorkbenchSidebar')
}

function resolveCssSize(value: number | string | undefined, fallback: string) {
  if (typeof value === 'number') {
    return `${value}px`
  }

  return value ?? fallback
}

function readStoredExpanded(storageKey: string | undefined, fallback: boolean) {
  if (!storageKey || typeof window === 'undefined') {
    return fallback
  }

  try {
    const stored = window.localStorage.getItem(storageKey)

    if (stored === null) {
      return fallback
    }

    return stored === 'true'
  } catch {
    return fallback
  }
}

function writeStoredExpanded(storageKey: string | undefined, expanded: boolean) {
  if (!storageKey || typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(storageKey, String(expanded))
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

function WorkbenchSidebarRoot({
  activeItemId = null,
  children,
  className,
  collapsedWidth,
  defaultExpanded = true,
  expanded: controlledExpanded,
  expandedWidth,
  labels,
  onExpandedChange,
  onItemSelect,
  showEdgeToggle = true,
  storageKey,
  style,
  ...props
}: WorkbenchSidebarRootProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = React.useState(() =>
    readStoredExpanded(storageKey, defaultExpanded),
  )
  const expanded = controlledExpanded ?? uncontrolledExpanded
  const resolvedLabels = React.useMemo<Required<WorkbenchSidebarLabels>>(
    () => ({ ...DEFAULT_LABELS, ...labels }),
    [labels],
  )
  const handleExpandedChange = React.useCallback(
    (nextExpanded: boolean) => {
      if (controlledExpanded === undefined) {
        setUncontrolledExpanded(nextExpanded)
      }

      writeStoredExpanded(storageKey, nextExpanded)
      onExpandedChange?.(nextExpanded)
    },
    [controlledExpanded, onExpandedChange, storageKey],
  )
  const contextValue = React.useMemo<WorkbenchSidebarContextValue>(
    () => ({
      activeItemId,
      expanded,
      labels: resolvedLabels,
      onExpandedChange: handleExpandedChange,
      onItemSelect,
    }),
    [
      activeItemId,
      expanded,
      handleExpandedChange,
      onItemSelect,
      resolvedLabels,
    ],
  )
  const rootStyle = React.useMemo<React.CSSProperties>(
    () => ({
      ...style,
      width: expanded
        ? resolveCssSize(expandedWidth, DEFAULT_EXPANDED_WIDTH)
        : resolveCssSize(collapsedWidth, DEFAULT_COLLAPSED_WIDTH),
    }),
    [collapsedWidth, expanded, expandedWidth, style],
  )

  return (
    <WorkbenchSidebarContext.Provider value={contextValue}>
      <aside
        {...props}
        data-expanded={expanded ? 'true' : 'false'}
        data-slot="workbench-sidebar"
        style={rootStyle}
        className={cn(
          'group/workbench-sidebar relative flex h-full min-h-0 shrink-0 flex-col overflow-visible bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out',
          className,
        )}
      >
        {showEdgeToggle ? <WorkbenchSidebarEdgeToggle /> : null}
        {children}
      </aside>
    </WorkbenchSidebarContext.Provider>
  )
}

function WorkbenchSidebarEdgeToggle() {
  const { expanded, labels, onExpandedChange } =
    useRequiredWorkbenchSidebarContext('WorkbenchSidebar.EdgeToggle')
  const [hoverReady, setHoverReady] = React.useState(false)
  const hoverTimerRef = React.useRef<number | null>(null)
  const ToggleIcon = expanded ? ChevronsLeft : ChevronsRight
  const label = expanded ? labels.collapse : labels.expand
  const clearHoverTimer = React.useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])
  const showHandle = React.useCallback(() => {
    clearHoverTimer()
    setHoverReady(true)
  }, [clearHoverTimer])
  const hideHandle = React.useCallback(() => {
    clearHoverTimer()
    setHoverReady(false)
  }, [clearHoverTimer])
  const handleMouseEnter = React.useCallback(() => {
    clearHoverTimer()
    hoverTimerRef.current = window.setTimeout(() => {
      setHoverReady(true)
      hoverTimerRef.current = null
    }, EDGE_TOGGLE_HOVER_DELAY_MS)
  }, [clearHoverTimer])
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      onExpandedChange(!expanded)
    },
    [expanded, onExpandedChange],
  )

  React.useEffect(() => clearHoverTimer, [clearHoverTimer])

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={label}
      title={label}
      data-slot="workbench-sidebar-edge-toggle"
      className="absolute inset-y-0 right-0 z-30 w-4 translate-x-1/2 cursor-pointer outline-none"
      onBlur={hideHandle}
      onClick={handleClick}
      onFocus={showHandle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={hideHandle}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-1/2 z-0 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/65 to-transparent transition-opacity duration-150',
          hoverReady ? 'opacity-100' : 'opacity-0',
        )}
      />
      <span
        className={cn(
          'absolute top-1/2 left-1/2 z-10 flex h-7 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-sm border border-primary/35 bg-card text-primary shadow-sm shadow-primary/10 transition-[border-color,color,opacity,transform] duration-150 ease-out',
          hoverReady
            ? 'scale-100 opacity-100'
            : 'pointer-events-none scale-95 opacity-0',
        )}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-primary/10"
        />
        <ToggleIcon className="relative z-10 size-2.5" />
      </span>
    </button>
  )
}

function WorkbenchSidebarContent({
  children,
  className,
  onScroll,
  scrollMaskClassName,
  ...props
}: WorkbenchSidebarContentProps) {
  const { expanded, labels } =
    useRequiredWorkbenchSidebarContext('WorkbenchSidebar.Content')
  const scrollViewportRef = React.useRef<HTMLElement | null>(null)
  const scrollbarHideTimerRef = React.useRef<number | null>(null)
  const [scrolling, setScrolling] = React.useState(false)
  const [scrollEdges, setScrollEdges] = React.useState<ScrollEdges>({
    top: false,
    bottom: false,
  })
  const clearScrollbarHideTimer = React.useCallback(() => {
    if (scrollbarHideTimerRef.current !== null) {
      window.clearTimeout(scrollbarHideTimerRef.current)
      scrollbarHideTimerRef.current = null
    }
  }, [])
  const getScrollViewport = React.useCallback(() => {
    return scrollViewportRef.current
  }, [])
  const updateScrollEdges = React.useCallback(() => {
    const scrollViewport = getScrollViewport()

    if (!scrollViewport) {
      setScrollEdges((current) =>
        current.top || current.bottom ? { top: false, bottom: false } : current,
      )
      return
    }

    const nextEdges = {
      top: scrollViewport.scrollTop > SCROLL_EDGE_THRESHOLD,
      bottom:
        scrollViewport.scrollTop + scrollViewport.clientHeight <
        scrollViewport.scrollHeight - SCROLL_EDGE_THRESHOLD,
    }

    setScrollEdges((current) =>
      current.top === nextEdges.top && current.bottom === nextEdges.bottom
        ? current
        : nextEdges,
    )
  }, [getScrollViewport])

  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      setScrolling((current) => (current ? current : true))
      onScroll?.(event)
      updateScrollEdges()

      clearScrollbarHideTimer()
      scrollbarHideTimerRef.current = window.setTimeout(() => {
        setScrolling(false)
        scrollbarHideTimerRef.current = null
      }, SCROLLBAR_HIDE_DELAY_MS)
    },
    [clearScrollbarHideTimer, onScroll, updateScrollEdges],
  )

  React.useEffect(() => clearScrollbarHideTimer, [clearScrollbarHideTimer])

  React.useLayoutEffect(() => {
    updateScrollEdges()
  }, [children, expanded, updateScrollEdges])

  React.useEffect(() => {
    const scrollViewport = getScrollViewport()

    if (!scrollViewport) {
      return undefined
    }

    const handleResize = () => updateScrollEdges()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(scrollViewport)
    Array.from(scrollViewport.children).forEach((child) => {
      resizeObserver.observe(child)
    })

    window.addEventListener('resize', handleResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [getScrollViewport, updateScrollEdges])

  return (
    <div
      data-slot="workbench-sidebar-content-wrap"
      className="relative min-h-0 flex-1"
    >
      <div
        aria-hidden="true"
        hidden={!scrollEdges.top}
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-sidebar to-sidebar/0',
          scrollMaskClassName,
        )}
      />
      <div
        aria-hidden="true"
        hidden={!scrollEdges.bottom}
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-sidebar to-sidebar/0',
          scrollMaskClassName,
        )}
      />
      <nav
        {...props}
        ref={scrollViewportRef}
        aria-label={props['aria-label'] ?? labels.navigation}
        data-scrolling={scrolling ? 'true' : 'false'}
        data-slot="workbench-sidebar-content"
        className={cn(
          'workbench-sidebar-scrollbar flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain [scrollbar-color:transparent_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-corner]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-thumb]:transition-colors [&::-webkit-scrollbar-track]:bg-transparent [&.is-scrolling]:[scrollbar-color:var(--border)_transparent] [&.is-scrolling::-webkit-scrollbar-thumb]:bg-border [&.is-scrolling::-webkit-scrollbar-thumb:hover]:bg-muted-foreground',
          scrolling && 'is-scrolling',
          expanded
            ? 'gap-2 px-4 py-4 pr-3'
            : 'items-center gap-1 px-3 py-5 pr-2',
          className,
        )}
        onScroll={handleScroll}
      >
        {children}
      </nav>
    </div>
  )
}

function WorkbenchSidebarFooter({
  children,
  className,
  ...props
}: WorkbenchSidebarFooterProps) {
  const { expanded } = useRequiredWorkbenchSidebarContext(
    'WorkbenchSidebar.Footer',
  )

  return (
    <div
      {...props}
      data-slot="workbench-sidebar-footer"
      className={cn(
        'shrink-0',
        expanded ? 'w-full' : 'flex w-full flex-col items-center',
        className,
      )}
    >
      {children}
    </div>
  )
}

function WorkbenchSidebarGroup({
  children,
  className,
  collapsed: controlledCollapsed,
  collapsible = true,
  defaultCollapsed = false,
  onCollapsedChange,
  title,
  ...props
}: WorkbenchSidebarGroupProps) {
  const { expanded } = useRequiredWorkbenchSidebarContext(
    'WorkbenchSidebar.Group',
  )
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = React.useState(
    defaultCollapsed,
  )
  const collapsed = controlledCollapsed ?? uncontrolledCollapsed
  const contentId = React.useId()
  const titleIsCollapsible = Boolean(title) && collapsible
  const showChildren = !expanded || !collapsed
  const handleCollapsedChange = React.useCallback(
    (nextCollapsed: boolean) => {
      if (controlledCollapsed === undefined) {
        setUncontrolledCollapsed(nextCollapsed)
      }

      onCollapsedChange?.(nextCollapsed)
    },
    [controlledCollapsed, onCollapsedChange],
  )
  const handleTitleClick = React.useCallback(() => {
    handleCollapsedChange(!collapsed)
  }, [collapsed, handleCollapsedChange])

  return (
    <section
      {...props}
      data-collapsed={collapsed ? 'true' : 'false'}
      data-slot="workbench-sidebar-group"
      className={cn(
        'flex w-full min-w-0 flex-col',
        expanded ? 'gap-1' : 'items-center gap-1',
        className,
      )}
    >
      {title && expanded ? (
        titleIsCollapsible ? (
          <button
            type="button"
            aria-controls={contentId}
            aria-expanded={!collapsed}
            className="group/workbench-sidebar-group-title flex h-7 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md px-2 text-left text-xs font-medium text-muted-foreground/75 outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleTitleClick}
          >
            <span className="min-w-0 truncate">{title}</span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-3 shrink-0 opacity-0 transition-[opacity,transform] duration-150 group-hover/workbench-sidebar-group-title:opacity-100 group-focus-visible/workbench-sidebar-group-title:opacity-100',
                collapsed && '-rotate-90',
              )}
            />
          </button>
        ) : (
          <p className="flex h-7 items-center px-2 text-xs font-medium text-muted-foreground/75">
            <span className="truncate">{title}</span>
          </p>
        )
      ) : null}
      <div
        id={contentId}
        hidden={!showChildren}
        className={cn(
          'flex w-full min-w-0 flex-col',
          expanded ? 'gap-0.5' : 'items-center gap-1',
        )}
      >
        {children}
      </div>
    </section>
  )
}

function WorkbenchSidebarUngrouped({
  children,
  className,
  separated = true,
  ...props
}: WorkbenchSidebarUngroupedProps) {
  const { expanded } = useRequiredWorkbenchSidebarContext(
    'WorkbenchSidebar.Ungrouped',
  )

  return (
    <section
      {...props}
      data-slot="workbench-sidebar-ungrouped"
      className={cn(
        'relative flex w-full min-w-0 shrink-0 flex-col',
        expanded
          ? 'gap-0.5 px-4 pt-3 pr-3 pb-2'
          : 'items-center gap-1 px-3 pt-2 pr-2 pb-2',
        separated &&
          (expanded
            ? 'before:absolute before:top-0 before:right-5 before:left-5 before:h-px before:bg-border before:content-[""]'
            : 'before:absolute before:top-0 before:right-3 before:left-3 before:h-px before:bg-border before:content-[""]'),
        className,
      )}
    >
      {children}
    </section>
  )
}

function WorkbenchSidebarBottom({
  children,
  className,
  ...props
}: WorkbenchSidebarBottomProps) {
  const { expanded } = useRequiredWorkbenchSidebarContext(
    'WorkbenchSidebar.Bottom',
  )

  return (
    <div
      {...props}
      data-slot="workbench-sidebar-bottom"
      className={cn(
        'shrink-0 px-3 py-3 before:mb-3 before:block before:h-px before:bg-border before:content-[""]',
        expanded ? 'px-4 before:mx-1' : 'px-2 before:mx-2 before:mb-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

function WorkbenchSidebarItem({
  active: activeProp,
  children,
  className,
  compactLabel,
  disabled,
  icon: Icon,
  id,
  onClick,
  onSelect,
  type = 'button',
  ...props
}: WorkbenchSidebarItemProps) {
  const { activeItemId, expanded, onItemSelect } =
    useRequiredWorkbenchSidebarContext('WorkbenchSidebar.Item')
  const active = activeProp ?? activeItemId === id
  const payload = React.useMemo<WorkbenchSidebarItemSelectPayload>(
    () => ({ id }),
    [id],
  )
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)

      if (event.defaultPrevented || disabled) {
        return
      }

      onSelect?.(payload)
      onItemSelect?.(payload)
    },
    [disabled, onClick, onItemSelect, onSelect, payload],
  )

  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      aria-current={active ? 'page' : undefined}
      data-active={active ? 'true' : 'false'}
      data-slot="workbench-sidebar-item"
      className={cn(
        'group/workbench-sidebar-item flex min-w-0 cursor-pointer items-center rounded-md text-left font-medium outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45',
        expanded
          ? 'h-8 w-full gap-2 px-2 text-sm'
          : 'mx-auto size-[52px] flex-col justify-center gap-1 px-1 text-sm',
        active
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
          : 'text-sidebar-foreground/78 hover:bg-muted hover:text-foreground',
        className,
      )}
      onClick={handleClick}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center transition-colors',
          expanded ? 'size-4' : 'size-5',
          active
            ? 'text-primary-foreground'
            : 'text-sidebar-foreground/72 group-hover/workbench-sidebar-item:text-foreground',
        )}
      >
        <Icon className="size-4 shrink-0" />
      </span>
      <span
        className={cn(
          'truncate leading-none',
          expanded
            ? 'min-w-0 flex-1 text-[14px]'
            : 'max-w-full text-[13px]',
          active && 'font-semibold',
        )}
      >
        {expanded ? children : (compactLabel ?? children)}
      </span>
    </button>
  )
}

export const WorkbenchSidebar = Object.assign(WorkbenchSidebarRoot, {
  Bottom: WorkbenchSidebarBottom,
  Content: WorkbenchSidebarContent,
  EdgeToggle: WorkbenchSidebarEdgeToggle,
  Footer: WorkbenchSidebarFooter,
  Group: WorkbenchSidebarGroup,
  Item: WorkbenchSidebarItem,
  Ungrouped: WorkbenchSidebarUngrouped,
})

export {
  WorkbenchSidebarBottom,
  WorkbenchSidebarContent,
  WorkbenchSidebarEdgeToggle,
  WorkbenchSidebarFooter,
  WorkbenchSidebarGroup,
  WorkbenchSidebarItem,
  WorkbenchSidebarRoot,
  WorkbenchSidebarUngrouped,
}
