import type { AssistantWorkbenchSnapshot } from '../model/types'
import type { AssistantWorkbenchActions } from './actions'
import { createAssistantWorkbenchActions } from './actions'
import { createExternalStore } from './create-external-store'
import {
  assistantWorkbenchInitialSnapshot,
  createAssistantWorkbenchResetSnapshot,
} from './state'

const assistantWorkbenchStore = createExternalStore(
  assistantWorkbenchInitialSnapshot,
)

function setSnapshot(
  updater:
    | AssistantWorkbenchSnapshot
    | ((current: AssistantWorkbenchSnapshot) => AssistantWorkbenchSnapshot),
) {
  assistantWorkbenchStore.setState(updater)
}

export const subscribeAssistantWorkbench = assistantWorkbenchStore.subscribe

export function getAssistantWorkbenchSnapshot() {
  return assistantWorkbenchStore.getSnapshot()
}

export function resetAssistantWorkbenchSnapshot() {
  const currentSnapshot = getAssistantWorkbenchSnapshot()

  setSnapshot(createAssistantWorkbenchResetSnapshot(currentSnapshot))
}

export const assistantWorkbenchActions: AssistantWorkbenchActions =
  createAssistantWorkbenchActions(setSnapshot)

export { createExternalStore }
