import type { ReactNode } from 'react'

import { usePermissionContext } from '#/context/permission-context.tsx'

export interface AccessGuardProps {
  children: ReactNode
  codes: Array<string | null | undefined>
  fallback?: ReactNode
  loadingFallback?: ReactNode
  match?: 'any' | 'every'
}

export function AccessGuard({
  children,
  codes,
  fallback = null,
  loadingFallback = null,
  match = 'any',
}: AccessGuardProps) {
  const { hasAnyPermission, hasEveryPermission, isLoading } =
    usePermissionContext()

  if (isLoading) {
    return <>{loadingFallback}</>
  }

  const canAccess =
    match === 'every' ? hasEveryPermission(codes) : hasAnyPermission(codes)

  return canAccess ? <>{children}</> : <>{fallback}</>
}
