export const SYSTEM_ENTRY_STORAGE_KEY = 'cyacle:system-entry'

export type SystemEntry = 'admin' | 'frontend'

export interface ResolveSystemEntryHomeToOptions {
  adminHomeTo: string
  frontendHomeTo: string
}

export function normalizeSystemEntry(value: unknown): SystemEntry {
  return value === 'admin' ? 'admin' : 'frontend'
}

export function getSystemEntry(): SystemEntry {
  if (typeof window === 'undefined') {
    return 'frontend'
  }

  try {
    return normalizeSystemEntry(
      window.localStorage.getItem(SYSTEM_ENTRY_STORAGE_KEY),
    )
  } catch {
    return 'frontend'
  }
}

export function resolveSystemEntryHomeTo({
  adminHomeTo,
  frontendHomeTo,
}: ResolveSystemEntryHomeToOptions): string {
  return getSystemEntry() === 'admin' ? adminHomeTo : frontendHomeTo
}
