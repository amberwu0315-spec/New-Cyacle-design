import * as React from 'react'
import { useSyncExternalStore } from 'react'

import { cn } from '#/lib/utils.ts'

import {
  buildAssistantAnchorChatSeedMessages,
  openAssistantAnchorChat,
} from './content'
import type {
  AssistantLaunchArea,
  AssistantWorkbenchRenderMode,
  AssistantWorkbenchSnapshot,
  AssistantWorkbenchTarget,
  AssistantWorkbenchThreadStrategy,
} from './model'
import {
  assistantWorkbenchActions,
  getAssistantWorkbenchSnapshot,
} from './store'
import { createExternalStore } from './store/create-external-store'

export type AgentCollaborationTarget = AssistantWorkbenchTarget
export type AgentCollaborationPanelPlacement = 'floating' | 'inline'

export interface AgentCollaborationPageConfig {
  enabled?: boolean
  showEntry?: boolean
  entryLabel?: string
  entryTooltip?: string
  defaultTarget?: AgentCollaborationTarget | null
  openAssistant?: () => void
  renderPanel?: (args: {
    snapshot: AssistantWorkbenchSnapshot
  }) => React.ReactNode
  panelDefaultWidth?: number
  panelMinWidth?: number
  panelMaxWidth?: number
  panelClassName?: string
  panelAnimationVariant?: 'inline' | 'floating'
  panelTestId?: string
}

export interface UseAgentCollaborationPageOptions {
  panelSlotClassName?: string
  panelSlotElement?: HTMLDivElement | null
}

export interface UseAgentCollaborationPageResult {
  enabled: boolean
  open: () => void
  close: () => void
  openTarget: (
    target: AgentCollaborationTarget,
    options?: {
      threadStrategy?: AssistantWorkbenchThreadStrategy
      renderMode?: AssistantWorkbenchRenderMode
    },
  ) => void
  panelSlot: React.ReactNode
}

interface RegisteredAgentCollaborationPageConfig extends AgentCollaborationPageConfig {
  enabled: boolean
  showEntry: boolean
  entryLabel: string
  entryTooltip: string
  defaultTarget: AgentCollaborationTarget | null
  panelSlotElement: HTMLDivElement | null
  openAssistantSource: AgentCollaborationPageConfig['openAssistant']
  renderPanelSource: AgentCollaborationPageConfig['renderPanel']
}

interface AgentCollaborationRegistrySnapshot {
  order: Array<string>
  entries: Map<string, RegisteredAgentCollaborationPageConfig | null>
}

const DEFAULT_PANEL_MIN_WIDTH = 340
const DEFAULT_PANEL_MAX_WIDTH = 560
const DEFAULT_PANEL_WIDTH = 420
const PANEL_PLACEMENT_STORAGE_KEY = 'agent-collaboration-panel-placement'

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

const initialSnapshot: AgentCollaborationRegistrySnapshot = {
  order: [],
  entries: new Map(),
}

const registryStore = createExternalStore(initialSnapshot)
const panelPlacementStore = createExternalStore<AgentCollaborationPanelPlacement>(
  readStoredPanelPlacement(),
)
const layoutPanelSlotElementStore = createExternalStore<HTMLDivElement | null>(
  null,
)
const dockInteractionActionVersionStore = createExternalStore(0)
let pendingAssistantCloseTimer: ReturnType<typeof setTimeout> | null = null
let pendingUnregisterOwnerId: string | null = null

function notifyDockInteractionAction() {
  dockInteractionActionVersionStore.setState((version) => version + 1)
}

function isAgentCollaborationPanelPlacement(
  value: string | null,
): value is AgentCollaborationPanelPlacement {
  return value === 'floating' || value === 'inline'
}

function readStoredPanelPlacement(): AgentCollaborationPanelPlacement {
  if (typeof window === 'undefined') {
    return 'floating'
  }

  try {
    const stored = window.localStorage.getItem(PANEL_PLACEMENT_STORAGE_KEY)

    return isAgentCollaborationPanelPlacement(stored) ? stored : 'floating'
  } catch {
    return 'floating'
  }
}

function writeStoredPanelPlacement(
  placement: AgentCollaborationPanelPlacement,
) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(PANEL_PLACEMENT_STORAGE_KEY, placement)
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

function cancelPendingAssistantClose() {
  if (pendingAssistantCloseTimer === null) {
    return
  }

  clearTimeout(pendingAssistantCloseTimer)
  pendingAssistantCloseTimer = null
}

function removeRegistryOwner(
  current: AgentCollaborationRegistrySnapshot,
  ownerId: string,
): AgentCollaborationRegistrySnapshot {
  if (!current.entries.has(ownerId) && !current.order.includes(ownerId)) {
    return current
  }

  const nextEntries = new Map(current.entries)
  nextEntries.delete(ownerId)

  return {
    order: current.order.filter((id) => id !== ownerId),
    entries: nextEntries,
  }
}

function scheduleAssistantCloseIfIdle() {
  cancelPendingAssistantClose()
  pendingAssistantCloseTimer = setTimeout(() => {
    pendingAssistantCloseTimer = null
    const pendingOwnerId = pendingUnregisterOwnerId

    if (pendingOwnerId) {
      pendingUnregisterOwnerId = null
      updateRegistrySnapshot((current) =>
        removeRegistryOwner(current, pendingOwnerId),
      )
    }

    if (resolveCurrentEntry(registryStore.getSnapshot()) != null) {
      return
    }

    assistantWorkbenchActions.close()
  }, 0)
}

function normalizeConfig(args: {
  config: AgentCollaborationPageConfig
  panelSlotElement: HTMLDivElement | null
  openAssistantSource: AgentCollaborationPageConfig['openAssistant']
  renderPanelSource: AgentCollaborationPageConfig['renderPanel']
}): RegisteredAgentCollaborationPageConfig {
  return {
    ...args.config,
    enabled: args.config.enabled !== false,
    showEntry: args.config.showEntry !== false,
    entryLabel: args.config.entryLabel?.trim() || 'AI',
    entryTooltip: args.config.entryTooltip?.trim() || '青钥助手',
    defaultTarget: args.config.defaultTarget ?? null,
    panelSlotElement: args.panelSlotElement,
    openAssistantSource: args.openAssistantSource,
    renderPanelSource: args.renderPanelSource,
  }
}

function resolveCurrentEntry(
  snapshot: AgentCollaborationRegistrySnapshot,
): RegisteredAgentCollaborationPageConfig | null {
  for (let index = snapshot.order.length - 1; index >= 0; index -= 1) {
    const ownerId = snapshot.order[index]
    const entry = snapshot.entries.get(ownerId) ?? null

    if (entry) {
      return entry
    }
  }

  return null
}

function areRegisteredConfigsEqual(
  left: RegisteredAgentCollaborationPageConfig | null | undefined,
  right: RegisteredAgentCollaborationPageConfig | null | undefined,
) {
  if (left === right) {
    return true
  }

  if (!left || !right) {
    return false
  }

  return (
    left.enabled === right.enabled &&
    left.showEntry === right.showEntry &&
    left.entryLabel === right.entryLabel &&
    left.entryTooltip === right.entryTooltip &&
    left.defaultTarget === right.defaultTarget &&
    left.openAssistant === right.openAssistant &&
    left.renderPanel === right.renderPanel &&
    left.openAssistantSource === right.openAssistantSource &&
    left.renderPanelSource === right.renderPanelSource &&
    left.panelDefaultWidth === right.panelDefaultWidth &&
    left.panelMinWidth === right.panelMinWidth &&
    left.panelMaxWidth === right.panelMaxWidth &&
    left.panelClassName === right.panelClassName &&
    left.panelAnimationVariant === right.panelAnimationVariant &&
    left.panelTestId === right.panelTestId &&
    left.panelSlotElement === right.panelSlotElement
  )
}

function updateRegistrySnapshot(
  updater: (
    current: AgentCollaborationRegistrySnapshot,
  ) => AgentCollaborationRegistrySnapshot,
) {
  registryStore.setState((current) => updater(current))
}

export function getCurrentAgentCollaborationPageConfig() {
  return resolveCurrentEntry(registryStore.getSnapshot())
}

export function subscribeCurrentAgentCollaborationPage(listener: () => void) {
  return registryStore.subscribe(listener)
}

export function getAgentCollaborationLayoutPanelSlotElement() {
  return layoutPanelSlotElementStore.getSnapshot()
}

export function subscribeAgentCollaborationLayoutPanelSlotElement(
  listener: () => void,
) {
  return layoutPanelSlotElementStore.subscribe(listener)
}

export const agentCollaborationActions = {
  registerPage(ownerId: string) {
    cancelPendingAssistantClose()

    updateRegistrySnapshot((current) => {
      if (current.order.includes(ownerId)) {
        return current
      }

      const nextEntries = new Map(current.entries)
      nextEntries.set(ownerId, current.entries.get(ownerId) ?? null)

      return {
        order: [...current.order, ownerId],
        entries: nextEntries,
      }
    })
  },

  setPageConfig(
    ownerId: string,
    config: RegisteredAgentCollaborationPageConfig | null,
  ) {
    cancelPendingAssistantClose()
    const pendingOwnerId = pendingUnregisterOwnerId

    updateRegistrySnapshot((current) => {
      const cleanedCurrent =
        pendingOwnerId && pendingOwnerId !== ownerId
          ? removeRegistryOwner(current, pendingOwnerId)
          : current
      const currentConfig = cleanedCurrent.entries.get(ownerId) ?? null

      if (
        areRegisteredConfigsEqual(currentConfig, config) &&
        cleanedCurrent.order.includes(ownerId)
      ) {
        return cleanedCurrent
      }

      const nextEntries = new Map(cleanedCurrent.entries)
      nextEntries.set(ownerId, config)

      return {
        order: cleanedCurrent.order.includes(ownerId)
          ? cleanedCurrent.order
          : [...cleanedCurrent.order, ownerId],
        entries: nextEntries,
      }
    })

    pendingUnregisterOwnerId = null
  },

  unregisterPage(ownerId: string) {
    cancelPendingAssistantClose()

    updateRegistrySnapshot((current) => {
      if (!current.entries.has(ownerId) && !current.order.includes(ownerId)) {
        return current
      }

      const nextSnapshot = removeRegistryOwner(current, ownerId)

      if (resolveCurrentEntry(nextSnapshot) == null) {
        pendingUnregisterOwnerId = ownerId
        return current
      }

      return nextSnapshot
    })

    if (pendingUnregisterOwnerId === ownerId) {
      scheduleAssistantCloseIfIdle()
    }
  },

  open() {
    const currentConfig = getCurrentAgentCollaborationPageConfig()

    if (!currentConfig?.enabled) {
      return
    }

    const currentSnapshot = getAssistantWorkbenchSnapshot()
    if (
      panelPlacementStore.getSnapshot() !== 'floating' &&
      !(currentSnapshot.open && currentSnapshot.renderMode === 'embedded')
    ) {
      notifyDockInteractionAction()
    }

    if (currentConfig.openAssistant) {
      currentConfig.openAssistant()
      return
    }

    if (currentConfig.defaultTarget) {
      agentCollaborationActions.openTarget(currentConfig.defaultTarget)
      return
    }

    assistantWorkbenchActions.open()
  },

  close() {
    const currentSnapshot = getAssistantWorkbenchSnapshot()
    if (
      panelPlacementStore.getSnapshot() !== 'floating' &&
      currentSnapshot.open &&
      currentSnapshot.renderMode === 'embedded'
    ) {
      notifyDockInteractionAction()
    }
    assistantWorkbenchActions.close()
  },

  hydratePanelPlacement() {
    panelPlacementStore.setState(readStoredPanelPlacement())
  },

  setLayoutPanelSlotElement(element: HTMLDivElement | null) {
    layoutPanelSlotElementStore.setState(element)
  },

  setPanelPlacement(placement: AgentCollaborationPanelPlacement) {
    const currentPlacement = panelPlacementStore.getSnapshot()
    if (currentPlacement === placement) {
      return
    }

    writeStoredPanelPlacement(placement)
    panelPlacementStore.setState(placement)
    notifyDockInteractionAction()
  },

  togglePanelPlacement() {
    panelPlacementStore.setState((current) => {
      const nextPlacement = current === 'floating' ? 'inline' : 'floating'
      writeStoredPanelPlacement(nextPlacement)
      notifyDockInteractionAction()

      return nextPlacement
    })
  },

  noteAssistantOpenChange(open: boolean) {
    const currentSnapshot = getAssistantWorkbenchSnapshot()
    const assistantEmbeddedOpen =
      currentSnapshot.open && currentSnapshot.renderMode === 'embedded'

    if (
      panelPlacementStore.getSnapshot() !== 'floating' &&
      assistantEmbeddedOpen !== open
    ) {
      notifyDockInteractionAction()
    }
  },

  openTarget(
    target: AgentCollaborationTarget,
    options?: {
      threadStrategy?: AssistantWorkbenchThreadStrategy
      renderMode?: AssistantWorkbenchRenderMode
    },
  ) {
    const launchArea = buildLaunchAreaFromTarget(target)

    openAssistantAnchorChat({
      launchArea,
      seedMessages: buildAssistantAnchorChatSeedMessages(launchArea),
      renderMode: options?.renderMode ?? 'embedded',
      session: {
        activationId: crypto.randomUUID(),
        threadStrategy: options?.threadStrategy ?? 'reuse-current-thread',
      },
    })
  },
}

export function getAgentCollaborationPanelPlacement() {
  return panelPlacementStore.getSnapshot()
}

export function subscribeAgentCollaborationPanelPlacement(listener: () => void) {
  return panelPlacementStore.subscribe(listener)
}

export function getAgentCollaborationPanelPlacementActionVersion() {
  return dockInteractionActionVersionStore.getSnapshot()
}

export function subscribeAgentCollaborationPanelPlacementActionVersion(
  listener: () => void,
) {
  return dockInteractionActionVersionStore.subscribe(listener)
}

export function useAgentCollaborationPanelPlacement() {
  return useSyncExternalStore(
    subscribeAgentCollaborationPanelPlacement,
    getAgentCollaborationPanelPlacement,
    getAgentCollaborationPanelPlacement,
  )
}

export function useAgentCollaborationPanelPlacementActionVersion() {
  return useSyncExternalStore(
    subscribeAgentCollaborationPanelPlacementActionVersion,
    getAgentCollaborationPanelPlacementActionVersion,
    getAgentCollaborationPanelPlacementActionVersion,
  )
}

export function useCurrentAgentCollaborationPageConfig() {
  return useSyncExternalStore(
    subscribeCurrentAgentCollaborationPage,
    getCurrentAgentCollaborationPageConfig,
    getCurrentAgentCollaborationPageConfig,
  )
}

export function useAgentCollaborationLayoutPanelSlotElement() {
  return useSyncExternalStore(
    subscribeAgentCollaborationLayoutPanelSlotElement,
    getAgentCollaborationLayoutPanelSlotElement,
    getAgentCollaborationLayoutPanelSlotElement,
  )
}

export function useAgentCollaborationPage(
  config: AgentCollaborationPageConfig | null,
  options?: UseAgentCollaborationPageOptions,
): UseAgentCollaborationPageResult {
  const ownerId = React.useId()
  const [localPanelSlotElement, setLocalPanelSlotElement] =
    React.useState<HTMLDivElement | null>(null)
  const openAssistantRef = React.useRef(config?.openAssistant)
  const renderPanelRef = React.useRef(config?.renderPanel)
  const hasExternalPanelSlot = Object.prototype.hasOwnProperty.call(
    options ?? {},
    'panelSlotElement',
  )
  const layoutPanelSlotElement = useAgentCollaborationLayoutPanelSlotElement()
  const panelSlotElement = hasExternalPanelSlot
    ? options?.panelSlotElement ?? null
    : layoutPanelSlotElement ?? localPanelSlotElement

  openAssistantRef.current = config?.openAssistant
  renderPanelRef.current = config?.renderPanel

  const handleOpenAssistant = React.useCallback(() => {
    openAssistantRef.current?.()
  }, [])

  const handleRenderPanel = React.useCallback(
    (args: { snapshot: AssistantWorkbenchSnapshot }) =>
      renderPanelRef.current?.(args) ?? null,
    [],
  )

  const normalizedConfig = React.useMemo(() => {
    if (!config) {
      return null
    }

    return normalizeConfig({
      config: {
        ...config,
        openAssistant: config.openAssistant ? handleOpenAssistant : undefined,
        renderPanel: config.renderPanel ? handleRenderPanel : undefined,
      },
      panelSlotElement,
      openAssistantSource: config.openAssistant,
      renderPanelSource: config.renderPanel,
    })
  }, [config, handleOpenAssistant, handleRenderPanel, panelSlotElement])

  // Ownership is a lifecycle concern, not a layout concern.
  // Keep mount/unmount separate from config updates so changing callbacks or
  // panel content never re-enters unregister/close cleanup paths.
  React.useEffect(() => {
    agentCollaborationActions.registerPage(ownerId)

    return () => {
      agentCollaborationActions.unregisterPage(ownerId)
    }
  }, [ownerId])

  React.useEffect(() => {
    agentCollaborationActions.setPageConfig(ownerId, normalizedConfig)
  }, [normalizedConfig, ownerId])

  const panelSlot = React.useMemo(() => {
    if (
      hasExternalPanelSlot ||
      layoutPanelSlotElement ||
      !normalizedConfig?.enabled
    ) {
      return null
    }

    return React.createElement('div', {
      ref: setLocalPanelSlotElement,
      className: cn('flex min-h-0 shrink-0', options?.panelSlotClassName),
    })
  }, [
    hasExternalPanelSlot,
    layoutPanelSlotElement,
    normalizedConfig?.enabled,
    options?.panelSlotClassName,
  ])

  return React.useMemo(
    () => ({
      enabled: normalizedConfig?.enabled ?? false,
      open: agentCollaborationActions.open,
      close: agentCollaborationActions.close,
      openTarget: agentCollaborationActions.openTarget,
      panelSlot,
    }),
    [normalizedConfig?.enabled, panelSlot],
  )
}

export function resolveAgentCollaborationPanelLayout(
  config: RegisteredAgentCollaborationPageConfig,
) {
  return {
    defaultWidth: config.panelDefaultWidth ?? DEFAULT_PANEL_WIDTH,
    minWidth: config.panelMinWidth ?? DEFAULT_PANEL_MIN_WIDTH,
    maxWidth: config.panelMaxWidth ?? DEFAULT_PANEL_MAX_WIDTH,
    className: config.panelClassName,
    animationVariant: config.panelAnimationVariant ?? 'inline',
    panelTestId: config.panelTestId ?? 'agent-collaboration-assistant-panel',
  }
}
