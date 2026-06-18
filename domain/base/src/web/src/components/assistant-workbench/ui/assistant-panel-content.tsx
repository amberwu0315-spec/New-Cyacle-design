'use client'

import * as React from 'react'
import { Bot, ChevronDown } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { useOptionalI18n } from '#/components/assistant-workbench/i18n/index.ts'
import { cn } from '#/lib/utils.ts'
import type { AssistantPanelContentProps } from '../model/types'

const AUTO_SCROLL_LOCK_THRESHOLD_PX = 1
const AUTO_SCROLL_RESUME_THRESHOLD_PX = 16
const DEFAULT_TOP_REACH_THRESHOLD_PX = 160
const TOP_REACH_RESET_OFFSET_PX = 48

function getViewportBottomOffset(element: HTMLDivElement) {
  return element.scrollHeight - element.clientHeight - element.scrollTop
}

function isViewportWithinBottomThreshold(
  element: HTMLDivElement,
  threshold: number,
) {
  const distanceToBottom = getViewportBottomOffset(element)

  return distanceToBottom <= threshold
}

export function AssistantPanelContent({
  title,
  description,
  headerBadge,
  headerActions,
  hideHeader = false,
  headerClassName,
  bodyShellClassName,
  viewportContentClassName,
  messagesClassName,
  sidebar,
  sidebarClassName,
  hasMessages,
  canLoadMoreAbove = false,
  loadingMoreAbove = false,
  onReachTop,
  topReachThresholdPx = DEFAULT_TOP_REACH_THRESHOLD_PX,
  viewportStateKey,
  messageViewportRef,
  messages,
  composer,
  composerClassName,
  footer,
  empty,
  className,
}: AssistantPanelContentProps) {
  const { messages: i18nMessages } = useOptionalI18n()
  const assistantMessages = i18nMessages.assistantWorkbench
  const resolvedTitle = title ?? assistantMessages.brand.panelTitle
  const internalViewportRef = React.useRef<HTMLDivElement | null>(null)
  const isPinnedToBottomRef = React.useRef(true)
  const pendingAutoScrollFrameRef = React.useRef<number | null>(null)
  const programmaticScrollInProgressRef = React.useRef(false)
  const lastScrollTopRef = React.useRef(0)
  const topReachTriggeredRef = React.useRef(false)
  const [autoScrollEnabled, setAutoScrollEnabled] = React.useState(true)
  const hasMessageRecords = hasMessages ?? Boolean(messages)
  const hasSidebar = Boolean(sidebar)

  const setViewportRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      internalViewportRef.current = node

      if (messageViewportRef && messageViewportRef.current !== node) {
        messageViewportRef.current = node
      }
    },
    [messageViewportRef],
  )

  const syncPinnedState = React.useCallback((nextValue: boolean) => {
    if (isPinnedToBottomRef.current === nextValue) {
      return
    }

    isPinnedToBottomRef.current = nextValue
    setAutoScrollEnabled(nextValue)
  }, [])

  const cancelPendingAutoScroll = React.useCallback(() => {
    if (pendingAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(pendingAutoScrollFrameRef.current)
      pendingAutoScrollFrameRef.current = null
    }
  }, [])

  const stopAutoScroll = React.useCallback(() => {
    cancelPendingAutoScroll()
    programmaticScrollInProgressRef.current = false
    syncPinnedState(false)
  }, [cancelPendingAutoScroll, syncPinnedState])

  const syncPinnedStateFromViewport = React.useCallback(() => {
    const viewport = internalViewportRef.current

    if (!(viewport instanceof HTMLDivElement)) {
      return
    }

    const currentScrollTop = viewport.scrollTop
    const previousScrollTop = lastScrollTopRef.current
    const scrollingUp = currentScrollTop < previousScrollTop
    const scrollingDown = currentScrollTop > previousScrollTop

    lastScrollTopRef.current = currentScrollTop

    let nextPinnedState = isPinnedToBottomRef.current

    if (scrollingUp) {
      nextPinnedState = isViewportWithinBottomThreshold(
        viewport,
        AUTO_SCROLL_LOCK_THRESHOLD_PX,
      )
    } else if (scrollingDown || programmaticScrollInProgressRef.current) {
      nextPinnedState = programmaticScrollInProgressRef.current
        ? true
        : isViewportWithinBottomThreshold(
            viewport,
            AUTO_SCROLL_RESUME_THRESHOLD_PX,
          )
    }

    if (
      programmaticScrollInProgressRef.current &&
      isViewportWithinBottomThreshold(viewport, AUTO_SCROLL_RESUME_THRESHOLD_PX)
    ) {
      programmaticScrollInProgressRef.current = false
    }

    if (nextPinnedState && !programmaticScrollInProgressRef.current) {
      programmaticScrollInProgressRef.current = false
    }

    syncPinnedState(nextPinnedState)
  }, [syncPinnedState])

  const scrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const viewport = internalViewportRef.current

      if (!(viewport instanceof HTMLDivElement)) {
        return
      }

      programmaticScrollInProgressRef.current = true

      if (typeof viewport.scrollTo === 'function') {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior,
        })
        return
      }

      viewport.scrollTop = viewport.scrollHeight
    },
    [],
  )

  React.useLayoutEffect(() => {
    cancelPendingAutoScroll()
    programmaticScrollInProgressRef.current = false
    topReachTriggeredRef.current = false
    lastScrollTopRef.current = 0
    syncPinnedState(true)
  }, [cancelPendingAutoScroll, syncPinnedState, viewportStateKey])

  React.useEffect(() => {
    if (!hasMessageRecords) {
      programmaticScrollInProgressRef.current = false
      lastScrollTopRef.current = 0
      syncPinnedState(true)
    }
  }, [hasMessageRecords, syncPinnedState])

  React.useEffect(() => {
    const viewport = internalViewportRef.current

    if (!(viewport instanceof HTMLDivElement)) {
      return
    }

    lastScrollTopRef.current = viewport.scrollTop
  }, [hasMessageRecords])

  React.useLayoutEffect(() => {
    const viewport = internalViewportRef.current

    if (!(viewport instanceof HTMLDivElement)) {
      return
    }

    lastScrollTopRef.current = viewport.scrollTop

    const hasScrollableOverflow = viewport.scrollHeight > viewport.clientHeight

    if (
      !hasMessageRecords ||
      !hasScrollableOverflow ||
      isViewportWithinBottomThreshold(viewport, AUTO_SCROLL_RESUME_THRESHOLD_PX)
    ) {
      programmaticScrollInProgressRef.current = false
      syncPinnedState(true)
    }
  }, [hasMessageRecords, messages, syncPinnedState, viewportStateKey])

  React.useLayoutEffect(() => {
    if (!hasMessageRecords || !isPinnedToBottomRef.current) {
      return
    }

    cancelPendingAutoScroll()

    pendingAutoScrollFrameRef.current = window.requestAnimationFrame(() => {
      pendingAutoScrollFrameRef.current = null

      if (!isPinnedToBottomRef.current) {
        return
      }

      scrollToBottom()
    })

    return () => {
      cancelPendingAutoScroll()
    }
  }, [
    cancelPendingAutoScroll,
    hasMessageRecords,
    messages,
    scrollToBottom,
    viewportStateKey,
  ])

  React.useEffect(() => {
    return () => {
      cancelPendingAutoScroll()
    }
  }, [cancelPendingAutoScroll])

  const handleViewportScroll = React.useCallback(() => {
    const viewport = internalViewportRef.current

    if (!(viewport instanceof HTMLDivElement)) {
      return
    }

    if (canLoadMoreAbove && onReachTop) {
      const currentScrollTop = viewport.scrollTop
      const previousScrollTop = lastScrollTopRef.current
      const scrollingUp = currentScrollTop < previousScrollTop
      const reachedTop = currentScrollTop <= topReachThresholdPx
      const leftPreloadZone =
        currentScrollTop > topReachThresholdPx + TOP_REACH_RESET_OFFSET_PX

      if (leftPreloadZone) {
        topReachTriggeredRef.current = false
      } else if (
        scrollingUp &&
        reachedTop &&
        !topReachTriggeredRef.current &&
        !loadingMoreAbove
      ) {
        topReachTriggeredRef.current = true
        onReachTop()
      }
    }

    if (programmaticScrollInProgressRef.current) {
      syncPinnedStateFromViewport()
      return
    }

    syncPinnedStateFromViewport()
  }, [
    canLoadMoreAbove,
    loadingMoreAbove,
    onReachTop,
    syncPinnedStateFromViewport,
    topReachThresholdPx,
  ])

  React.useEffect(() => {
    if (!canLoadMoreAbove) {
      topReachTriggeredRef.current = false
    }
  }, [canLoadMoreAbove])

  const handleViewportWheelCapture = React.useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (event.deltaY < 0) {
        cancelPendingAutoScroll()
      }
    },
    [cancelPendingAutoScroll],
  )

  const handleViewportPointerDownCapture = React.useCallback(() => {
    cancelPendingAutoScroll()
  }, [cancelPendingAutoScroll])

  const handleViewportTouchStartCapture = React.useCallback(() => {
    cancelPendingAutoScroll()
  }, [cancelPendingAutoScroll])

  const handleViewportKeyDownCapture = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        event.key === 'ArrowUp' ||
        event.key === 'PageUp' ||
        event.key === 'Home'
      ) {
        stopAutoScroll()
      }
    },
    [stopAutoScroll],
  )

  const handleResumeAutoScroll = React.useCallback(() => {
    syncPinnedState(true)

    window.requestAnimationFrame(() => {
      scrollToBottom('smooth')
    })
  }, [scrollToBottom, syncPinnedState])

  return (
    <section
      data-assistant-panel-content="true"
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-card',
        className,
      )}
    >
      {hideHeader ? null : (
        <header
          className={cn(
            'flex shrink-0 justify-between gap-3 border-b bg-muted/35 px-4 py-3',
            description ? 'min-h-16 items-start' : 'h-16 items-center',
            headerClassName,
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-[-0.01em] text-foreground">
                {resolvedTitle}
              </h2>
              {headerBadge ?? (
                <Badge
                  variant="outline"
                  className="h-6 shrink-0 gap-1 rounded-full px-2 text-[11px] font-medium"
                >
                  <Bot className="size-3 text-primary" />
                  {assistantMessages.brand.ai}
                </Badge>
              )}
            </div>
            {description ? (
              <div className="mt-1 text-[11px] leading-5 text-muted-foreground">
                {description}
              </div>
            ) : null}
          </div>
          {headerActions ? (
            <div className="flex shrink-0 items-center gap-1.5">
              {headerActions}
            </div>
          ) : null}
        </header>
      )}

      <div className={cn('flex min-h-0 flex-1 flex-col', bodyShellClassName)}>
        <div className="relative min-h-0 flex-1">
          <div
            ref={setViewportRef}
            className="h-full overflow-auto overflow-x-hidden py-0 pr-2 pl-4"
            onKeyDownCapture={handleViewportKeyDownCapture}
            onPointerDownCapture={handleViewportPointerDownCapture}
            onTouchStartCapture={handleViewportTouchStartCapture}
            onWheelCapture={handleViewportWheelCapture}
            onScroll={handleViewportScroll}
          >
            <div className={cn('py-4', viewportContentClassName)}>
              {hasSidebar ? (
                <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-5">
                  <aside
                    className={cn(
                      'min-w-0 md:sticky md:top-0 md:self-start',
                      sidebarClassName,
                    )}
                  >
                    {sidebar}
                  </aside>
                  <div
                    className={cn(
                      'flex min-w-0 flex-col gap-3',
                      messagesClassName,
                    )}
                  >
                    {hasMessageRecords ? messages : empty}
                  </div>
                </div>
              ) : hasMessageRecords ? (
                <div className={cn('flex flex-col gap-3', messagesClassName)}>
                  {messages}
                </div>
              ) : (
                empty
              )}
            </div>
          </div>

          {hasMessageRecords && !autoScrollEnabled ? (
            <div className="pointer-events-none absolute right-4 bottom-4 z-10">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={assistantMessages.panel.backToBottom}
                className="pointer-events-auto rounded-full border-transparent bg-background/92 text-muted-foreground shadow-none backdrop-blur hover:bg-background hover:text-foreground"
                onClick={handleResumeAutoScroll}
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>

        {composer ? (
          <div
            className={cn(
              'shrink-0 border-t bg-card px-4 py-4',
              composerClassName,
            )}
          >
            {composer}
          </div>
        ) : null}
      </div>

      {footer ? (
        <div className="shrink-0 border-t px-4 py-3">{footer}</div>
      ) : null}
    </section>
  )
}
