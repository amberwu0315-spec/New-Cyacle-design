import type {
  AssistantContentProtocol,
  AssistantLaunchArea,
  AssistantWorkbenchAttachment,
  AssistantWorkbenchMessage,
  AssistantWorkbenchOpenForTargetOptions,
  AssistantWorkbenchOpenWithProtocolOptions,
  AssistantWorkbenchRenderMode,
  AssistantWorkbenchSnapshot,
  AssistantWorkbenchTarget,
} from '../model/types'
import type { StoreUpdater } from './create-external-store'

type SetSnapshot = (updater: StoreUpdater<AssistantWorkbenchSnapshot>) => void

function buildAreaFromTarget(target: AssistantWorkbenchTarget) {
  return {
    id: target.id,
    title: target.title?.trim() || target.label.trim(),
    description: target.description,
  }
}

function buildLaunchAreaFromTarget(
  target: AssistantWorkbenchTarget,
): AssistantLaunchArea {
  return {
    area: buildAreaFromTarget(target),
  }
}

function buildActiveTargetFromProtocol(
  protocol: AssistantContentProtocol | null,
): AssistantWorkbenchTarget | null {
  if (!protocol) {
    return null
  }

  const areaTitle = protocol.launchArea.area.title.trim()

  return {
    id: protocol.launchArea.area.id,
    label: areaTitle || protocol.launchArea.area.id,
    title: areaTitle || protocol.launchArea.area.id,
    description: protocol.launchArea.area.description,
  }
}

export interface AssistantWorkbenchActions {
  open: () => void
  close: () => void
  toggle: () => void
  requestFocus: () => void
  setDisplayMode: (
    displayMode: AssistantWorkbenchSnapshot['displayMode'],
  ) => void
  setRenderMode: (renderMode: AssistantWorkbenchRenderMode) => void
  setContentProtocol: (protocol: AssistantContentProtocol | null) => void
  setActiveTarget: (target: AssistantWorkbenchTarget | null) => void
  setComposerValue: (composerValue: string) => void
  setAttachments: (attachments: Array<AssistantWorkbenchAttachment>) => void
  setSending: (sending: boolean) => void
  replaceMessages: (messages: Array<AssistantWorkbenchMessage>) => void
  appendMessage: (message: AssistantWorkbenchMessage) => void
  clearDraft: () => void
  clearSession: () => void
  openForTarget: (
    target: AssistantWorkbenchTarget,
    options?: AssistantWorkbenchOpenForTargetOptions,
  ) => void
  openWithProtocol: (
    protocol: AssistantContentProtocol,
    options?: AssistantWorkbenchOpenWithProtocolOptions,
  ) => void
}

export function createAssistantWorkbenchActions(
  setSnapshot: SetSnapshot,
): AssistantWorkbenchActions {
  return {
    open() {
      setSnapshot((current) => ({
        ...current,
        open: true,
      }))
    },

    close() {
      setSnapshot((current) => ({
        ...current,
        open: false,
      }))
    },

    toggle() {
      setSnapshot((current) => ({
        ...current,
        open: !current.open,
      }))
    },

    requestFocus() {
      setSnapshot((current) => ({
        ...current,
        focusSignal: current.focusSignal + 1,
      }))
    },

    setDisplayMode(displayMode) {
      setSnapshot((current) => ({
        ...current,
        displayMode,
        renderMode:
          current.renderMode === 'embedded' ? current.renderMode : displayMode,
      }))
    },

    setRenderMode(renderMode) {
      setSnapshot((current) => ({
        ...current,
        renderMode,
      }))
    },

    setContentProtocol(protocol) {
      setSnapshot((current) => ({
        ...current,
        contentProtocol: protocol,
        activeTarget: buildActiveTargetFromProtocol(protocol),
      }))
    },

    setActiveTarget(target) {
      setSnapshot((current) => ({
        ...current,
        activeTarget: target,
        contentProtocol:
          current.contentProtocol && target
            ? {
                ...current.contentProtocol,
                launchArea: {
                  ...current.contentProtocol.launchArea,
                  area: buildAreaFromTarget(target),
                },
              }
            : target
              ? current.contentProtocol
              : null,
      }))
    },

    setComposerValue(composerValue) {
      setSnapshot((current) => ({
        ...current,
        composerValue,
      }))
    },

    setAttachments(attachments) {
      setSnapshot((current) => ({
        ...current,
        attachments,
      }))
    },

    setSending(sending) {
      setSnapshot((current) => ({
        ...current,
        sending,
      }))
    },

    replaceMessages(messages) {
      setSnapshot((current) => ({
        ...current,
        messages,
      }))
    },

    appendMessage(message) {
      setSnapshot((current) => ({
        ...current,
        messages: [...current.messages, message],
      }))
    },

    clearDraft() {
      setSnapshot((current) => ({
        ...current,
        composerValue: '',
        attachments: [],
      }))
    },

    clearSession() {
      setSnapshot((current) => ({
        ...current,
        contentProtocol: null,
        activeTarget: null,
        messages: [],
        composerValue: '',
        attachments: [],
        sending: false,
      }))
    },

    openForTarget(target, options) {
      setSnapshot((current) => ({
        ...current,
        open: true,
        contentProtocol: {
          type: 'anchor-chat',
          version: 1,
          launchArea: buildLaunchAreaFromTarget(target),
          seed: options?.messages ? { messages: options.messages } : undefined,
        },
        activeTarget: target,
        renderMode: options?.renderMode ?? current.renderMode,
        messages: options?.messages ?? current.messages,
        composerValue:
          options?.resetDraft === false ? current.composerValue : '',
        attachments: options?.resetDraft === false ? current.attachments : [],
        focusSignal:
          options?.requestFocus === false
            ? current.focusSignal
            : current.focusSignal + 1,
      }))
    },

    openWithProtocol(protocol, options) {
      setSnapshot((current) => ({
        ...current,
        open: true,
        contentProtocol: protocol,
        activeTarget: buildActiveTargetFromProtocol(protocol),
        renderMode: options?.renderMode ?? current.renderMode,
        messages: protocol.seed?.messages ?? current.messages,
        composerValue:
          options?.resetDraft === false ? current.composerValue : '',
        attachments: options?.resetDraft === false ? current.attachments : [],
        focusSignal:
          options?.requestFocus === false
            ? current.focusSignal
            : current.focusSignal + 1,
      }))
    },
  }
}
