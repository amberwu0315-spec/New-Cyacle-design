import * as React from 'react'

import type { AppLayoutAsyncState } from '#/components/layouts/app-layout/app-layout.tsx'

export type PermissionCodeMap = Record<string, boolean>

export interface PermissionContextValue {
  hasAnyPermission: (codes: Array<string | null | undefined>) => boolean
  hasEveryPermission: (codes: Array<string | null | undefined>) => boolean
  hasPermission: (code?: string | null) => boolean
  isLoading: boolean
  permissionCodeMap: PermissionCodeMap
}

const PermissionContext = React.createContext<PermissionContextValue | null>(null)

export interface PermissionProviderProps {
  children: React.ReactNode
  permissionQuery: AppLayoutAsyncState<PermissionCodeMap>
}

export function PermissionProvider({
  children,
  permissionQuery,
}: PermissionProviderProps) {
  const permissionCodeMap = permissionQuery.data ?? {}
  const hasPermission = React.useCallback(
    (code?: string | null) => !code || Boolean(permissionCodeMap[code]),
    [permissionCodeMap],
  )
  const hasAnyPermission = React.useCallback(
    (codes: Array<string | null | undefined>) => {
      const effectiveCodes = codes.filter(Boolean)

      return (
        effectiveCodes.length === 0 ||
        effectiveCodes.some((code) => hasPermission(code))
      )
    },
    [hasPermission],
  )
  const hasEveryPermission = React.useCallback(
    (codes: Array<string | null | undefined>) => {
      const effectiveCodes = codes.filter(Boolean)

      return (
        effectiveCodes.length === 0 ||
        effectiveCodes.every((code) => hasPermission(code))
      )
    },
    [hasPermission],
  )
  const value = React.useMemo<PermissionContextValue>(
    () => ({
      hasAnyPermission,
      hasEveryPermission,
      hasPermission,
      isLoading:
        Boolean(permissionQuery.isLoading) ||
        (permissionQuery.isFetching && !permissionQuery.data),
      permissionCodeMap,
    }),
    [
      hasAnyPermission,
      hasEveryPermission,
      hasPermission,
      permissionCodeMap,
      permissionQuery.data,
      permissionQuery.isFetching,
      permissionQuery.isLoading,
    ],
  )

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissionContext() {
  const context = React.useContext(PermissionContext)

  if (!context) {
    throw new Error('usePermissionContext must be used within PermissionProvider.')
  }

  return context
}

export function useHasPermission(code?: string | null) {
  return usePermissionContext().hasPermission(code)
}
