import { useSyncExternalStore } from 'react'
import type { AssistantWorkbenchSnapshot } from '../model/types'

import {
  assistantWorkbenchActions,
  getAssistantWorkbenchSnapshot,
  subscribeAssistantWorkbench,
} from './store'

export function useAssistantWorkbenchSnapshot() {
  return useSyncExternalStore(
    subscribeAssistantWorkbench,
    getAssistantWorkbenchSnapshot,
    getAssistantWorkbenchSnapshot,
  )
}

export function useAssistantWorkbenchSelector<T>(
  selector: (snapshot: AssistantWorkbenchSnapshot) => T,
) {
  return useSyncExternalStore(
    subscribeAssistantWorkbench,
    () => selector(getAssistantWorkbenchSnapshot()),
    () => selector(getAssistantWorkbenchSnapshot()),
  )
}

export function useAssistantWorkbenchActions() {
  return assistantWorkbenchActions
}
