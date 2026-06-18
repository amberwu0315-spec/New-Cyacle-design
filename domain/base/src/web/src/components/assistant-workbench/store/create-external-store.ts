type StoreListener = () => void

export type StoreUpdater<TSnapshot> =
  | TSnapshot
  | ((current: TSnapshot) => TSnapshot)

export interface ExternalStore<TSnapshot> {
  getSnapshot: () => TSnapshot
  setState: (updater: StoreUpdater<TSnapshot>) => void
  subscribe: (listener: StoreListener) => () => void
}

export function createExternalStore<TSnapshot>(
  initialSnapshot: TSnapshot,
): ExternalStore<TSnapshot> {
  const listeners = new Set<StoreListener>()
  let snapshot = initialSnapshot

  function emitChange() {
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    getSnapshot() {
      return snapshot
    },

    setState(updater) {
      const nextSnapshot =
        typeof updater === 'function'
          ? (updater as (current: TSnapshot) => TSnapshot)(snapshot)
          : updater

      if (Object.is(nextSnapshot, snapshot)) {
        return
      }

      snapshot = nextSnapshot
      emitChange()
    },

    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}
