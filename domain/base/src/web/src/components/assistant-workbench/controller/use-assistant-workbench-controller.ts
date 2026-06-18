import * as React from 'react'

import {
  assistantWorkbenchActions,
  getAssistantWorkbenchSnapshot,
  useAssistantWorkbenchSnapshot,
} from '../store'
import type {
  AssistantContentProtocol,
  AssistantWorkbenchOpenForTargetOptions,
  AssistantWorkbenchRenderMode,
} from '../model'
import type { AssistantWorkbenchAdapter } from '../adapters'

type Updater<T> = T | ((current: T) => T)

export interface UseAssistantWorkbenchControllerOptions<
  TTarget,
  TMessage,
  TAttachment,
> {
  adapter: AssistantWorkbenchAdapter<TTarget, TMessage, TAttachment>
}

export function useAssistantWorkbenchController<
  TTarget,
  TMessage,
  TAttachment,
>({
  adapter,
}: UseAssistantWorkbenchControllerOptions<TTarget, TMessage, TAttachment>) {
  const snapshot = useAssistantWorkbenchSnapshot()
  const [attachments, setAttachmentsState] = React.useState<Array<TAttachment>>([])
  const attachmentsRef = React.useRef<Array<TAttachment>>([])
  const composerValueRef = React.useRef(snapshot.composerValue)

  React.useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  React.useEffect(() => {
    composerValueRef.current = snapshot.composerValue
  }, [snapshot.composerValue])

  const activeTarget = React.useMemo(
    () => adapter.fromWorkbenchTarget(snapshot.activeTarget),
    [adapter, snapshot.activeTarget],
  )
  const messages = React.useMemo(
    () => snapshot.messages.map(adapter.fromWorkbenchMessage),
    [adapter, snapshot.messages],
  )

  const setOpen = React.useCallback((open: boolean) => {
    if (open) {
      assistantWorkbenchActions.open()
      return
    }

    assistantWorkbenchActions.close()
  }, [])

  const requestFocus = React.useCallback(() => {
    assistantWorkbenchActions.requestFocus()
  }, [])

  const setComposerValue = React.useCallback((value: string) => {
    composerValueRef.current = value
    assistantWorkbenchActions.setComposerValue(value)
  }, [])

  const setContentProtocol = React.useCallback(
    (protocol: AssistantContentProtocol | null) => {
      assistantWorkbenchActions.setContentProtocol(protocol)
    },
    [],
  )

  const setMessages = React.useCallback(
    (updater: Updater<Array<TMessage>>) => {
      const currentMessages = getAssistantWorkbenchSnapshot().messages.map(
        adapter.fromWorkbenchMessage,
      )
      const nextMessages =
        typeof updater === 'function' ? updater(currentMessages) : updater

      assistantWorkbenchActions.replaceMessages(
        nextMessages.map(adapter.toWorkbenchMessage),
      )
    },
    [adapter],
  )

  const setAttachments = React.useCallback(
    (updater: Updater<Array<TAttachment>>) => {
      const currentAttachments = attachmentsRef.current
      const nextAttachments =
        typeof updater === 'function' ? updater(currentAttachments) : updater

      attachmentsRef.current = nextAttachments
      setAttachmentsState(nextAttachments)
      assistantWorkbenchActions.setAttachments(
        nextAttachments.map(adapter.toWorkbenchAttachment),
      )
    },
    [adapter],
  )

  const clearDraft = React.useCallback(() => {
    assistantWorkbenchActions.clearDraft()
    attachmentsRef.current = []
    setAttachmentsState([])
  }, [])

  const clearSession = React.useCallback(() => {
    assistantWorkbenchActions.clearSession()
    attachmentsRef.current = []
    setAttachmentsState([])
  }, [])

  const setActiveTarget = React.useCallback(
    (target: TTarget | null) => {
      assistantWorkbenchActions.setActiveTarget(
        target ? adapter.toWorkbenchTarget(target) : null,
      )
    },
    [adapter],
  )

  const openForTarget = React.useCallback(
    (
      target: TTarget,
      options?: Omit<AssistantWorkbenchOpenForTargetOptions, 'messages'> & {
        messages?: Array<TMessage>
      },
    ) => {
      if (options?.resetDraft !== false) {
        attachmentsRef.current = []
        setAttachmentsState([])
      }

      assistantWorkbenchActions.openForTarget(
        adapter.toWorkbenchTarget(target),
        {
          ...options,
          messages: options?.messages?.map(adapter.toWorkbenchMessage),
        },
      )
    },
    [adapter],
  )

  const setRenderMode = React.useCallback(
    (renderMode: AssistantWorkbenchRenderMode) => {
      assistantWorkbenchActions.setRenderMode(renderMode)
    },
    [],
  )

  return {
    open: snapshot.open,
    displayMode: snapshot.displayMode,
    renderMode: snapshot.renderMode,
    contentProtocol: snapshot.contentProtocol,
    workbenchMessages: snapshot.messages,
    focusSignal: snapshot.focusSignal,
    composerValue: snapshot.composerValue,
    composerValueRef,
    sending: snapshot.sending,
    activeTarget,
    messages,
    attachments,
    attachmentsRef,
    setOpen,
    requestFocus,
    setComposerValue,
    setContentProtocol,
    setMessages,
    setAttachments,
    setActiveTarget,
    clearDraft,
    clearSession,
    openForTarget,
    setRenderMode,
  }
}
