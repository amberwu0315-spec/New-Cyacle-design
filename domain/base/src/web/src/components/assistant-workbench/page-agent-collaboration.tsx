'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { PanelRightClose, PanelRightOpen, Sparkles } from 'lucide-react'

import {
  AssistantAnchorChatRenderer,
  appendAssistantDraftAttachments,
  buildAssistantAnchorChatSeedMessages,
  openAssistantAnchorChat,
} from './content'
import type { AssistantDraftAttachment } from './content'
import { useAssistantAgentSession } from './controller'
import { createAssistantRandomId } from './lib/id'
import type { AssistantLaunchArea } from './model'
import { AssistantResizableEmbeddedRenderer } from './ui'
import {
  assistantWorkbenchActions,
  useAssistantWorkbenchSelector,
  useAssistantWorkbenchSnapshot,
} from './store'
import { Button } from '#/components/ui/button.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip.tsx'
import { useOptionalI18n } from '#/components/assistant-workbench/i18n/index.ts'
import { cn } from '#/lib/utils.ts'
import { getWebProjectConfig } from '#/lib/web-project-config.ts'

import {
  agentCollaborationActions,
  resolveAgentCollaborationPanelLayout,
  useAgentCollaborationPanelPlacementActionVersion,
  useAgentCollaborationPanelPlacement,
  useCurrentAgentCollaborationPageConfig,
  useAgentCollaborationPage as useAgentCollaborationPageBase,
} from './page-agent-collaboration-store'
import type {
  AgentCollaborationPageConfig,
  AgentCollaborationTarget,
  UseAgentCollaborationPageOptions,
  UseAgentCollaborationPageResult,
} from './page-agent-collaboration-store'
import { toast } from '#/components/ui/toast.tsx'

const ENTRY_SIZE = 48
const ENTRY_SAFE_GAP = 32
const ENTRY_DRAG_ZONE_SIZE = 600
const ENTRY_LONG_PRESS_DELAY = 160
const ENTRY_MOVE_TOLERANCE = 6
const ENTRY_POSITION_STORAGE_KEY = 'agent-collaboration-entry-position'

interface EntryPosition {
  right: number
  bottom: number
}

interface PointerPosition {
  x: number
  y: number
}

function areEntryPositionsEqual(
  left: EntryPosition | null,
  right: EntryPosition,
) {
  return left?.right === right.right && left.bottom === right.bottom
}

function clamp(value: number, min: number, max: number) {
  if (max <= min) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}

function resolveEntryBoundary(element: HTMLElement) {
  const offsetParent = element.offsetParent
  const parentRect =
    offsetParent instanceof HTMLElement
      ? offsetParent.getBoundingClientRect()
      : null
  const width = parentRect?.width || window.innerWidth
  const height = parentRect?.height || window.innerHeight

  return {
    height,
    width,
  }
}

function resolveEntryDragBounds(element: HTMLElement) {
  const boundary = resolveEntryBoundary(element)
  const minRight = ENTRY_SAFE_GAP
  const minBottom = ENTRY_SAFE_GAP
  const maxRight = Math.max(
    minRight,
    Math.min(
      ENTRY_DRAG_ZONE_SIZE - ENTRY_SIZE,
      boundary.width - ENTRY_SAFE_GAP - ENTRY_SIZE,
    ),
  )
  const maxBottom = Math.max(
    minBottom,
    Math.min(
      ENTRY_DRAG_ZONE_SIZE - ENTRY_SIZE,
      boundary.height - ENTRY_SAFE_GAP - ENTRY_SIZE,
    ),
  )

  return {
    maxBottom,
    maxRight,
    minBottom,
    minRight,
  }
}

function getDefaultEntryPosition(element: HTMLElement): EntryPosition {
  const bounds = resolveEntryDragBounds(element)

  return {
    bottom: bounds.minBottom,
    right: bounds.minRight,
  }
}

function clampEntryPosition(
  element: HTMLElement,
  position: EntryPosition,
): EntryPosition {
  const bounds = resolveEntryDragBounds(element)

  return {
    bottom: clamp(position.bottom, bounds.minBottom, bounds.maxBottom),
    right: clamp(position.right, bounds.minRight, bounds.maxRight),
  }
}

function readStoredEntryPosition() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedValue = window.localStorage.getItem(ENTRY_POSITION_STORAGE_KEY)

    if (!storedValue) {
      return null
    }

    const parsedValue: unknown = JSON.parse(storedValue)

    if (
      !parsedValue ||
      typeof parsedValue !== 'object'
    ) {
      return null
    }

    if ('right' in parsedValue && 'bottom' in parsedValue) {
      const right = Number(parsedValue.right)
      const bottom = Number(parsedValue.bottom)

      if (!Number.isFinite(right) || !Number.isFinite(bottom)) {
        return null
      }

      return { bottom, right }
    }

    return null
  } catch {
    return null
  }
}

function writeStoredEntryPosition(position: EntryPosition) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      ENTRY_POSITION_STORAGE_KEY,
      JSON.stringify(position),
    )
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

function buildLaunchAreaFromTarget(
  target: AgentCollaborationTarget,
): AssistantLaunchArea {
  return {
    area: {
      id: target.id,
      title: target.title.trim() || target.label,
      description: target.description,
    },
  }
}

function openAgentTarget(
  target: AgentCollaborationTarget,
  messages?: ReturnType<typeof useOptionalI18n>['messages']['assistantWorkbench'],
) {
  const launchArea = buildLaunchAreaFromTarget(target)

  openAssistantAnchorChat({
    launchArea,
    seedMessages: buildAssistantAnchorChatSeedMessages(launchArea, messages),
    renderMode: 'embedded',
    session: {
      activationId: createAssistantRandomId(),
      threadStrategy: 'reuse-current-thread',
    },
  })
}

function DefaultAgentCollaborationPanel({
  defaultTarget,
}: {
  defaultTarget: AgentCollaborationTarget
}) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const snapshot = useAssistantWorkbenchSnapshot()
  const panelPlacement = useAgentCollaborationPanelPlacement()
  const pageConfig = useCurrentAgentCollaborationPageConfig()
  const fallbackLaunchArea = React.useMemo(
    () => buildLaunchAreaFromTarget(defaultTarget),
    [defaultTarget],
  )
  const launchArea = snapshot.contentProtocol?.launchArea ?? fallbackLaunchArea
  const resolveThreadTags = React.useCallback(
    () => [
      {
        key: 'assistantScope',
        value: defaultTarget.id,
      },
    ],
    [defaultTarget.id],
  )
  const resolveDefaultAnchors = React.useCallback(
    () => launchArea.anchors ?? [],
    [launchArea.anchors],
  )
  const session = useAssistantAgentSession({
    enabled: snapshot.open,
    scopeId: `agent-collaboration:${defaultTarget.id}`,
    activeTarget: snapshot.activeTarget ?? defaultTarget,
    launchArea,
    threadStrategy: snapshot.contentProtocol?.session?.threadStrategy,
    threadActivationId: snapshot.contentProtocol?.session?.activationId,
    resolveDefaultAnchors,
    resolveThreadTags,
  })
  const visibleMessages =
    session.messages.length > 0 ? session.messages : snapshot.messages

  const handleAppendAttachments = React.useCallback(
    async (files: Array<File>) => {
      if (files.length === 0) {
        return
      }

      try {
        const result = await appendAssistantDraftAttachments({
          current: snapshot.attachments as Array<AssistantDraftAttachment>,
          files,
          messages: assistantMessages,
        })
        assistantWorkbenchActions.setAttachments(result.attachments)
        result.rejectedMessages.forEach((message) => toast.add({
          type: 'error',
          description: message,
        }))

        const uploadedAttachments = await session.uploadAttachments(
          result.attachments,
        )
        assistantWorkbenchActions.setAttachments(uploadedAttachments)
        uploadedAttachments.forEach((attachment) => {
          if (attachment.uploadStatus === 'failed' && attachment.errorMessage) {
            // toast.error(attachment.errorMessage)
            toast.add({
              type: 'error',
              description: attachment.errorMessage,
            })
          }
        })
      } catch (error) {
        toast.add({
          type: 'error',
          description: error instanceof Error ? error.message : assistantMessages.errors.uploadFailed,
        })
      }
    },
    [assistantMessages, session, snapshot.attachments],
  )

  const handleSend = React.useCallback(async () => {
    try {
      const result = await session.sendMessage({
        content: snapshot.composerValue,
        attachments: snapshot.attachments as Array<AssistantDraftAttachment>,
      })

      assistantWorkbenchActions.setAttachments(result.attachments)
      assistantWorkbenchActions.clearDraft()
    } catch (error) {
      toast.add({
        type: 'error',
        description:
          error instanceof Error
            ? error.message
            : assistantMessages.errors.messageSendFailed,
      })
    }
  }, [assistantMessages, session, snapshot.attachments, snapshot.composerValue])

  const handleSendSuggestion = React.useCallback(
    async (content: string) => {
      try {
        await session.sendMessage({
          content,
          attachments: [],
        })
      } catch (error) {
        toast.add({
          type: 'error',
          description:
            error instanceof Error
              ? error.message
              : assistantMessages.errors.messageSendFailed,
        })
      }
    },
    [assistantMessages, session],
  )
  const handleTogglePanelPlacement = React.useCallback(() => {
    agentCollaborationActions.setPanelPlacement(
      panelPlacement === 'floating' ? 'inline' : 'floating',
    )
  }, [panelPlacement])
  const placementLabel =
    panelPlacement === 'floating'
      ? assistantMessages.collaboration.pinToRight
      : assistantMessages.collaboration.floatAssistant
  const canTogglePanelPlacement =
    panelPlacement !== 'floating' || Boolean(pageConfig?.panelSlotElement)

  return (
    <AssistantAnchorChatRenderer
      open={snapshot.open}
      renderMode="embedded"
      protocol={snapshot.contentProtocol}
      threads={session.threads}
      activeThreadId={session.currentThreadId}
      currentRun={session.currentRun}
      progressItems={session.progressItems}
      runProgressStateByRunId={session.runProgressStateByRunId}
      pendingInteractions={session.pendingInteractions}
      loadingThread={session.loadingThread}
      messages={visibleMessages}
      composerValue={snapshot.composerValue}
      attachments={snapshot.attachments as Array<AssistantDraftAttachment>}
      sending={snapshot.sending || session.isBusy}
      focusSignal={snapshot.focusSignal}
      onComposerChange={assistantWorkbenchActions.setComposerValue}
      onAppendAttachments={handleAppendAttachments}
      onRemoveAttachment={(attachmentId) => {
        assistantWorkbenchActions.setAttachments(
          snapshot.attachments.filter(
            (attachment) => attachment.id !== attachmentId,
          ),
        )
      }}
      onClearAnchor={() => openAgentTarget(defaultTarget, assistantMessages)}
      onOpenChange={(open) => {
        if (open) {
          agentCollaborationActions.noteAssistantOpenChange(true)
          openAgentTarget(snapshot.activeTarget ?? defaultTarget, assistantMessages)
          return
        }

        agentCollaborationActions.close()
      }}
      onRenderModeChange={() => {}}
      onCreateThread={session.startThreadDraft}
      onLoadRunProgress={session.loadRunProgress}
      onSelectThread={session.selectThread}
      onCancelRun={session.cancelRun}
      onSendSuggestion={handleSendSuggestion}
      onSubmitInteraction={session.submitInteraction}
      onSend={handleSend}
      canSwitchThreads={session.canSwitchThreads}
      allowModeSwitching={false}
      headerClassName="items-center"
      additionalHeaderActions={
        <TooltipProvider delay={0}>
          {canTogglePanelPlacement ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    aria-label={placementLabel}
                    onClick={handleTogglePanelPlacement}
                  />
                }
              >
                <PanelRightOpen className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>{placementLabel}</TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  aria-label={assistantMessages.collaboration.collapseAssistant}
                  onClick={() => agentCollaborationActions.close()}
                />
              }
            >
              <PanelRightClose className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>
              {assistantMessages.collaboration.collapseAssistant}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      }
      panelAriaLabel={assistantMessages.brand.panelAriaLabel}
      panelDescription={assistantMessages.brand.sheetPanelDescription}
    />
  )
}

export function AgentAnchorButton({
  target,
  className,
}: {
  target: AgentCollaborationTarget
  className?: string
}) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const activeTargetId = useAssistantWorkbenchSelector(
    (snapshot) => snapshot.activeTarget?.id ?? null,
  )
  const isActive = activeTargetId === target.id
  const collaborationLabel = assistantMessages.collaboration.aiCollaboration(
    target.label,
  )

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              'size-7 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary',
              isActive && 'bg-primary/10 text-primary',
              className,
            )}
            aria-label={collaborationLabel}
            onClick={() => openAgentTarget(target, assistantMessages)}
          />
        }
      >
        <Sparkles className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>
        <p>{collaborationLabel}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function AgentCollaborationRoot() {
  if (!getWebProjectConfig().capabilities.agent.enabled) {
    return null
  }

  return <EnabledAgentCollaborationRoot />
}

function EnabledAgentCollaborationRoot() {
  const config = useCurrentAgentCollaborationPageConfig()
  const assistantOpen = useAssistantWorkbenchSelector(
    (snapshot) => snapshot.open && snapshot.renderMode === 'embedded',
  )
  const panelPlacement = useAgentCollaborationPanelPlacement()
  const snapshot = useAssistantWorkbenchSnapshot()
  const [entryPosition, setEntryPosition] =
    React.useState<EntryPosition | null>(null)
  const [entryDragging, setEntryDragging] = React.useState(false)
  const entryRef = React.useRef<HTMLDivElement | null>(null)
  const entryLongPressTimeoutRef = React.useRef<number | null>(null)
  const entryPendingCleanupRef = React.useRef<(() => void) | null>(null)
  const entryDragCleanupRef = React.useRef<(() => void) | null>(null)
  const suppressEntryClickRef = React.useRef(false)
  const suppressEntryClickTimeoutRef = React.useRef<number | null>(null)
  const entryVisible = Boolean(
    config?.enabled && config.showEntry && !assistantOpen,
  )

  React.useEffect(() => {
    return () => {
      entryPendingCleanupRef.current?.()
      entryDragCleanupRef.current?.()

      if (entryLongPressTimeoutRef.current !== null) {
        window.clearTimeout(entryLongPressTimeoutRef.current)
      }

      if (suppressEntryClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressEntryClickTimeoutRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    agentCollaborationActions.hydratePanelPlacement()
  }, [])

  const suppressNextEntryClick = React.useCallback(() => {
    suppressEntryClickRef.current = true

    if (suppressEntryClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressEntryClickTimeoutRef.current)
    }

    suppressEntryClickTimeoutRef.current = window.setTimeout(() => {
      suppressEntryClickRef.current = false
      suppressEntryClickTimeoutRef.current = null
    }, 0)
  }, [])

  React.useLayoutEffect(() => {
    if (!entryVisible) {
      return
    }

    const element = entryRef.current

    if (!element) {
      return
    }

    const storedPosition = readStoredEntryPosition()

    if (!storedPosition) {
      return
    }

    const nextPosition = clampEntryPosition(element, storedPosition)
    setEntryPosition((currentPosition) =>
      areEntryPositionsEqual(currentPosition, nextPosition)
        ? currentPosition
        : nextPosition,
    )
    writeStoredEntryPosition(nextPosition)
  }, [entryVisible])

  React.useEffect(() => {
    if (!entryVisible) {
      return
    }

    const handleResize = () => {
      const element = entryRef.current

      if (!element) {
        return
      }

      setEntryPosition((currentPosition) => {
        if (!currentPosition) {
          return currentPosition
        }

        const nextPosition = clampEntryPosition(element, currentPosition)
        writeStoredEntryPosition(nextPosition)

        return areEntryPositionsEqual(currentPosition, nextPosition)
          ? currentPosition
          : nextPosition
      })
    }

    window.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [entryVisible])

  const startEntryDragging = React.useCallback(
    (args: {
      initialPointer?: PointerPosition
      startPointer: PointerPosition
      suppressClickOnFinish?: boolean
    }) => {
      const element = entryRef.current

      if (!element) {
        return
      }

      entryDragCleanupRef.current?.()

      const startPosition = clampEntryPosition(
        element,
        entryPosition ?? getDefaultEntryPosition(element),
      )
      const {
        initialPointer,
        startPointer,
        suppressClickOnFinish = false,
      } = args
      let moved = false
      let latestPosition = startPosition

      setEntryDragging(true)
      setEntryPosition(startPosition)

      const handlePointerMove = (moveEvent: {
        clientX: number
        clientY: number
      }) => {
        const deltaX = moveEvent.clientX - startPointer.x
        const deltaY = moveEvent.clientY - startPointer.y

        if (!moved && Math.hypot(deltaX, deltaY) > ENTRY_MOVE_TOLERANCE) {
          moved = true
        }

        const nextPosition = clampEntryPosition(element, {
          bottom: startPosition.bottom - deltaY,
          right: startPosition.right - deltaX,
        })

        latestPosition = nextPosition
        setEntryPosition(nextPosition)
      }

      const finishDragging = () => {
        setEntryDragging(false)
        entryDragCleanupRef.current?.()
        entryDragCleanupRef.current = null

        if (moved || suppressClickOnFinish) {
          suppressNextEntryClick()
        }

        if (moved) {
          writeStoredEntryPosition(latestPosition)
        }
      }

      entryDragCleanupRef.current = () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', finishDragging)
        window.removeEventListener('pointercancel', finishDragging)
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', finishDragging)
      window.addEventListener('pointercancel', finishDragging)

      if (initialPointer) {
        handlePointerMove({
          clientX: initialPointer.x,
          clientY: initialPointer.y,
        })
      }
    },
    [entryPosition, suppressNextEntryClick],
  )

  const handleEntryPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || !entryRef.current) {
        return
      }

      const startPointer = {
        x: event.clientX,
        y: event.clientY,
      }
      let latestPointer = startPointer
      let movedBeforeLongPress = false

      entryPendingCleanupRef.current?.()

      const clearLongPressTimeout = () => {
        if (entryLongPressTimeoutRef.current !== null) {
          window.clearTimeout(entryLongPressTimeoutRef.current)
          entryLongPressTimeoutRef.current = null
        }
      }

      const cleanupPendingLongPress = () => {
        clearLongPressTimeout()
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', finishPendingLongPress)
        window.removeEventListener('pointercancel', finishPendingLongPress)

        if (entryPendingCleanupRef.current === cleanupPendingLongPress) {
          entryPendingCleanupRef.current = null
        }
      }

      const activateLongPressDrag = () => {
        entryLongPressTimeoutRef.current = null
        cleanupPendingLongPress()
        startEntryDragging({
          initialPointer: latestPointer,
          startPointer,
          suppressClickOnFinish: true,
        })
      }

      function handlePointerMove(moveEvent: PointerEvent) {
        latestPointer = {
          x: moveEvent.clientX,
          y: moveEvent.clientY,
        }

        const deltaX = moveEvent.clientX - startPointer.x
        const deltaY = moveEvent.clientY - startPointer.y

        if (Math.hypot(deltaX, deltaY) > ENTRY_MOVE_TOLERANCE) {
          movedBeforeLongPress = true
        }
      }

      function finishPendingLongPress() {
        cleanupPendingLongPress()

        if (movedBeforeLongPress) {
          suppressNextEntryClick()
        }
      }

      entryLongPressTimeoutRef.current = window.setTimeout(
        activateLongPressDrag,
        ENTRY_LONG_PRESS_DELAY,
      )
      entryPendingCleanupRef.current = cleanupPendingLongPress

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', finishPendingLongPress)
      window.addEventListener('pointercancel', finishPendingLongPress)
    },
    [startEntryDragging, suppressNextEntryClick],
  )

  const handleEntryClick = React.useCallback(() => {
    if (suppressEntryClickRef.current) {
      return
    }

    agentCollaborationActions.open()
  }, [])

  const panelContent = React.useMemo(() => {
    if (!config?.enabled || !assistantOpen) {
      return null
    }

    if (config.renderPanel) {
      return config.renderPanel({ snapshot })
    }

    if (!config.defaultTarget) {
      return null
    }

    return (
      <DefaultAgentCollaborationPanel defaultTarget={config.defaultTarget} />
    )
  }, [assistantOpen, config, snapshot])

  const panelLayout = React.useMemo(
    () => (config ? resolveAgentCollaborationPanelLayout(config) : null),
    [config],
  )
  const floatingPanel =
    panelLayout?.animationVariant === 'floating' &&
    panelPlacement === 'floating'

  const panelRenderer =
    config?.enabled && panelLayout && panelContent ? (
      <AssistantResizableEmbeddedRenderer
        open={assistantOpen}
        defaultWidth={panelLayout.defaultWidth}
        minWidth={panelLayout.minWidth}
        maxWidth={panelLayout.maxWidth}
        animationVariant={floatingPanel ? 'floating' : 'inline'}
        className={cn(
          'h-full overflow-visible rounded-[14px] border-0 bg-transparent [&_[data-assistant-panel-content]]:border-0',
          floatingPanel && 'pointer-events-auto',
          assistantOpen &&
            (floatingPanel
              ? '[&_[data-assistant-panel-content]]:shadow-[0_18px_42px_-18px_rgb(6_22_45/0.34),0_0_24px_0_rgb(26_130_153/0.4)]'
              : '[&_[data-assistant-panel-content]]:!shadow-none'),
          panelLayout.className,
        )}
        panelTestId={panelLayout.panelTestId}
      >
        {panelContent}
      </AssistantResizableEmbeddedRenderer>
    ) : null

  const panelNode =
    config?.enabled &&
    !floatingPanel &&
    config.panelSlotElement &&
    panelRenderer &&
    typeof document !== 'undefined'
      ? createPortal(panelRenderer, config.panelSlotElement)
      : null

  return (
    <>
      {floatingPanel && panelRenderer ? (
        <div className="pointer-events-none absolute right-5 bottom-5 z-30 flex h-[min(820px,calc(100%-40px))] min-h-0 shrink-0 items-end justify-end">
          {panelRenderer}
        </div>
      ) : null}
      {entryVisible && config ? (
        <div
          ref={entryRef}
          data-testid="agent-collaboration-entry"
          className={cn(
            'pointer-events-none absolute z-40',
            !entryPosition && 'right-8 bottom-8',
          )}
          style={
            entryPosition
              ? {
                  bottom: entryPosition.bottom,
                  right: entryPosition.right,
                }
              : undefined
          }
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className={cn(
                    'group pointer-events-auto relative !size-[62px] touch-none select-none overflow-visible rounded-full border-0 bg-[linear-gradient(90deg,#08233D_0%,#00738E_40%,#1CA25A_100%)] p-0 text-white shadow-[0_0_18px_0_rgb(26_130_153/0.38)] ring-0 transition-[background,box-shadow,filter,transform] duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(90deg,#08233D_0%,#00738E_40%,#1CA25A_100%)] hover:text-white hover:shadow-[0_0_22px_0_rgb(26_130_153/0.44)] focus-visible:ring-3 focus-visible:ring-[#1A8299]/30',
                    entryDragging ? 'cursor-grabbing' : 'cursor-pointer',
                  )}
                  aria-label={config.entryTooltip}
                  onPointerDown={handleEntryPointerDown}
                  onClick={handleEntryClick}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="relative z-10 size-[34px] text-white transition-transform duration-200 group-hover:scale-105"
                  >
                    <path
                      fill="currentColor"
                      d="M5.5 16A2.5 2.5 0 0 0 8 18.5v1A2.5 2.5 0 0 0 5.5 22h-1A2.5 2.5 0 0 0 2 19.5v-1A2.5 2.5 0 0 0 4.5 16h1Zm5.178-10.793c.325-1.368 2.319-1.37 2.644 0l.027.142.042.255a6.26 6.26 0 0 0 5.26 5.046c1.553.224 1.561 2.473 0 2.699a6.26 6.26 0 0 0-5.302 5.301c-.225 1.563-2.475 1.554-2.699 0a6.26 6.26 0 0 0-5.3-5.3c-1.56-.225-1.557-2.474 0-2.699l.255-.042a6.26 6.26 0 0 0 5.046-5.26l.028-.141ZM19.5 2A2.5 2.5 0 0 0 22 4.5v1A2.5 2.5 0 0 0 19.5 8h-1A2.5 2.5 0 0 0 16 5.5v-1A2.5 2.5 0 0 0 18.5 2h1Z"
                    />
                  </svg>
                  <span className="sr-only">{config.entryLabel}</span>
                </Button>
              }
            />
            <TooltipContent align="end">
              <p>{config.entryTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : null}
      {panelNode}
    </>
  )
}

export function useAgentCollaborationPage(
  config: AgentCollaborationPageConfig | null,
  options?: UseAgentCollaborationPageOptions,
): UseAgentCollaborationPageResult {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench
  const resolvedConfig = React.useMemo<AgentCollaborationPageConfig | null>(() => {
    if (!config) {
      return null
    }

    return {
      ...config,
      entryLabel: config.entryLabel ?? assistantMessages.brand.entryLabel,
      entryTooltip: config.entryTooltip ?? assistantMessages.brand.entryTooltip,
    }
  }, [assistantMessages, config])

  return useAgentCollaborationPageBase(resolvedConfig, options)
}

export type { AgentCollaborationTarget, AgentCollaborationPageConfig }
export {
  agentCollaborationActions,
  useAgentCollaborationPanelPlacement,
  useAgentCollaborationPanelPlacementActionVersion,
}
