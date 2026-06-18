'use client'

import * as React from 'react'

import { useOptionalI18n } from '#/components/assistant-workbench/i18n/index.ts'
import { cn } from '#/lib/utils.ts'

export interface AssistantResizableEmbeddedRendererProps {
  open: boolean
  hidden?: boolean
  animationVariant?: 'inline' | 'floating'
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  animationDurationMs?: number
  contentEnterDelayMs?: number
  resizeHandleAriaLabel?: string
  widthStorageKey?: string
  className?: string
  panelTestId?: string
  children: React.ReactNode
}

const ASSISTANT_RESIZABLE_PANEL_WIDTH_STORAGE_KEY =
  'agent-collaboration-panel-width'

function clampPanelWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, Math.round(width)))
}

function readStoredPanelWidth({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
}: {
  storageKey: string
  defaultWidth: number
  minWidth: number
  maxWidth: number
}) {
  if (typeof window === 'undefined') {
    return clampPanelWidth(defaultWidth, minWidth, maxWidth)
  }

  try {
    const stored = Number(window.localStorage.getItem(storageKey))

    return Number.isFinite(stored) && stored > 0
      ? clampPanelWidth(stored, minWidth, maxWidth)
      : clampPanelWidth(defaultWidth, minWidth, maxWidth)
  } catch {
    return clampPanelWidth(defaultWidth, minWidth, maxWidth)
  }
}

function writeStoredPanelWidth(storageKey: string, width: number) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(storageKey, String(width))
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

export function AssistantResizableEmbeddedRenderer({
  open,
  hidden = false,
  animationVariant = 'inline',
  defaultWidth = 420,
  minWidth = 340,
  maxWidth = 560,
  animationDurationMs = 200,
  contentEnterDelayMs = 80,
  resizeHandleAriaLabel,
  widthStorageKey = ASSISTANT_RESIZABLE_PANEL_WIDTH_STORAGE_KEY,
  className,
  panelTestId,
  children,
}: AssistantResizableEmbeddedRendererProps) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const resolvedResizeHandleAriaLabel =
    resizeHandleAriaLabel ?? assistantMessages.panel.resizeHandleAriaLabel
  const panelRef = React.useRef<HTMLDivElement | null>(null)
  const [panelWidth, setPanelWidth] = React.useState(() =>
    readStoredPanelWidth({
      storageKey: widthStorageKey,
      defaultWidth,
      minWidth,
      maxWidth,
    }),
  )
  const [resizing, setResizing] = React.useState(false)
  const [panelVisible, setPanelVisible] = React.useState(open && !hidden)
  const [panelEntered, setPanelEntered] = React.useState(open && !hidden)
  const floating = animationVariant === 'floating'
  const effectiveAnimationDurationMs = floating
    ? Math.max(animationDurationMs, 260)
    : animationDurationMs

  React.useEffect(() => {
    if (hidden) {
      setPanelEntered(false)
      setPanelVisible(false)
      return
    }

    if (open) {
      setPanelVisible(true)

      const frameId = window.requestAnimationFrame(() => {
        setPanelEntered(true)
      })

      return () => {
        window.cancelAnimationFrame(frameId)
      }
    }

    setPanelEntered(false)

    const timeoutId = window.setTimeout(() => {
      setPanelVisible(false)
    }, effectiveAnimationDurationMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [effectiveAnimationDurationMs, hidden, open])

  const handleResizeStart = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return
      }

      event.preventDefault()

      const startClientX = event.clientX
      const startWidth = panelWidth
      const previousCursor = document.body.style.cursor
      const previousUserSelect = document.body.style.userSelect
      const panelElement = panelRef.current
      const previousPanelTransition = panelElement?.style.transition ?? ''
      let nextWidth = startWidth
      let frameId: number | null = null

      const applyPanelWidth = () => {
        frameId = null

        if (panelElement) {
          panelElement.style.width = `${nextWidth}px`
        }
      }

      setResizing(true)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      if (panelElement) {
        panelElement.style.transition = 'none'
      }

      function handlePointerMove(moveEvent: PointerEvent) {
        nextWidth = Math.min(
          maxWidth,
          Math.max(
            minWidth,
            Math.round(startWidth - (moveEvent.clientX - startClientX)),
          ),
        )

        if (frameId === null) {
          frameId = window.requestAnimationFrame(applyPanelWidth)
        }
      }

      function handlePointerUp() {
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId)
          frameId = null
        }

        if (panelElement) {
          panelElement.style.width = `${nextWidth}px`
        }

        setResizing(false)
        setPanelWidth(nextWidth)
        writeStoredPanelWidth(widthStorageKey, nextWidth)
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousUserSelect
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        window.removeEventListener('pointercancel', handlePointerUp)

        window.requestAnimationFrame(() => {
          if (panelElement) {
            panelElement.style.transition = previousPanelTransition
          }
        })
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('pointercancel', handlePointerUp)
    },
    [maxWidth, minWidth, panelWidth, widthStorageKey],
  )

  return (
    <div
      ref={panelRef}
      className={cn(
        'relative flex min-h-0 shrink-0 flex-col overflow-hidden',
        resizing
          ? 'will-change-[width]'
          : floating
            ? 'origin-bottom-right transition-[opacity,transform] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform'
            : 'transition-[width,opacity,transform] ease-out',
        className,
      )}
      style={{
        width: floating
          ? `${panelWidth}px`
          : panelEntered
            ? `${panelWidth}px`
            : '0px',
        minWidth: '0px',
        maxWidth: `${maxWidth}px`,
        opacity: panelEntered ? 1 : 0,
        transform: floating
          ? panelEntered
            ? 'translate3d(0, 0, 0) scale(1)'
            : 'translate3d(0, 0, 0) scale(0.18)'
          : panelEntered
            ? 'translateX(0)'
            : 'translateX(12px)',
        pointerEvents: open ? 'auto' : 'none',
        transitionDuration: `${effectiveAnimationDurationMs}ms`,
      }}
      data-testid={panelTestId}
      aria-hidden={!open}
    >
      <div
        role="separator"
        aria-label={resolvedResizeHandleAriaLabel}
        aria-orientation="vertical"
        className="absolute inset-y-0 left-0 z-10 w-3 cursor-col-resize"
        onPointerDown={handleResizeStart}
      />

      {panelVisible ? (
        <div
          className="flex h-full min-h-0 flex-col transition-[opacity,transform] ease-out"
          style={{
            opacity: panelEntered ? 1 : 0,
            transform: floating
              ? panelEntered
                ? 'translateY(0)'
                : 'translateY(8px)'
              : panelEntered
                ? 'translateX(0)'
                : 'translateX(8px)',
            transitionDuration: `${effectiveAnimationDurationMs}ms`,
            transitionDelay: floating
              ? '0ms'
              : panelEntered
                ? `${contentEnterDelayMs}ms`
                : '0ms',
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
