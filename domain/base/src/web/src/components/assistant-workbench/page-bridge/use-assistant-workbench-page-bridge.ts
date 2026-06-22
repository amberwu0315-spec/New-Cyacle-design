import * as React from 'react'

import {
  assistantWorkbenchActions,
  useAssistantWorkbenchSnapshot,
} from '../store'

export interface AssistantWorkbenchPageBridgeAssistant<TTarget> {
  setOpen: (open: boolean) => void
  requestAiEdit: (target: TTarget) => void
  clearAnchor: () => void
  activeTarget: TTarget | null
}

export interface UseAssistantWorkbenchPageBridgeOptions<
  TTarget,
  TContextValue,
  TDockProps,
> {
  assistant: AssistantWorkbenchPageBridgeAssistant<TTarget>
  resolveActiveTarget: (args: {
    assistantTarget: TTarget | null
    workbenchTarget: ReturnType<typeof useAssistantWorkbenchSnapshot>['activeTarget']
  }) => TTarget | null
  createContextValue: (args: {
    requestAiEdit: (target: TTarget) => void
  }) => TContextValue | null
  createDockProps: (args: {
    assistantWorkbench: ReturnType<typeof useAssistantWorkbenchSnapshot>
    assistant: AssistantWorkbenchPageBridgeAssistant<TTarget>
    onOpenChange: (open: boolean) => void
    onClearAnchor: () => void
  }) => TDockProps
}

export interface AssistantWorkbenchPageBridgeResult<
  TTarget,
  TContextValue,
  TDockProps,
> {
  assistantWorkbenchOpen: boolean
  isEmbeddedAssistant: boolean
  activeTarget: TTarget | null
  contextValue: TContextValue | null
  dockProps: TDockProps
}

export function useAssistantWorkbenchPageBridge<
  TTarget,
  TContextValue,
  TDockProps,
>({
  assistant,
  resolveActiveTarget,
  createContextValue,
  createDockProps,
}: UseAssistantWorkbenchPageBridgeOptions<TTarget, TContextValue, TDockProps>): AssistantWorkbenchPageBridgeResult<
  TTarget,
  TContextValue,
  TDockProps
> {
  const assistantWorkbench = useAssistantWorkbenchSnapshot()

  React.useEffect(() => {
    assistant.setOpen(assistantWorkbench.open)
  }, [assistant, assistantWorkbench.open])

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (open) {
      assistantWorkbenchActions.open()
      return
    }

    assistantWorkbenchActions.close()
  }, [])

  const handleRequestAiEdit = React.useCallback(
    (target: TTarget) => {
      assistant.requestAiEdit(target)
    },
    [assistant],
  )

  const handleClearAnchor = React.useCallback(() => {
    assistantWorkbenchActions.setActiveTarget(null)
    assistant.clearAnchor()
  }, [assistant])

  const activeTarget = React.useMemo(
    () =>
      resolveActiveTarget({
        assistantTarget: assistant.activeTarget,
        workbenchTarget: assistantWorkbench.activeTarget,
      }),
    [assistant.activeTarget, assistantWorkbench.activeTarget, resolveActiveTarget],
  )

  const contextValue = React.useMemo(
    () => createContextValue({ requestAiEdit: handleRequestAiEdit }),
    [createContextValue, handleRequestAiEdit],
  )

  const dockProps = React.useMemo(
    () =>
      createDockProps({
        assistantWorkbench,
        assistant,
        onOpenChange: handleOpenChange,
        onClearAnchor: handleClearAnchor,
      }),
    [assistant, assistantWorkbench, createDockProps, handleClearAnchor, handleOpenChange],
  )

  return {
    assistantWorkbenchOpen: assistantWorkbench.open,
    isEmbeddedAssistant:
      assistantWorkbench.open && assistantWorkbench.renderMode === 'embedded',
    activeTarget,
    contextValue,
    dockProps,
  }
}
