import type { AssistantWorkbenchSnapshot } from '../model/types'

export const assistantWorkbenchInitialSnapshot: AssistantWorkbenchSnapshot = {
  open: false,
  displayMode: 'sheet',
  renderMode: 'sheet',
  contentProtocol: null,
  activeTarget: null,
  messages: [],
  composerValue: '',
  attachments: [],
  sending: false,
  focusSignal: 0,
}

export function createAssistantWorkbenchResetSnapshot(
  currentSnapshot: AssistantWorkbenchSnapshot,
): AssistantWorkbenchSnapshot {
  return {
    ...assistantWorkbenchInitialSnapshot,
    renderMode: currentSnapshot.displayMode,
  }
}
