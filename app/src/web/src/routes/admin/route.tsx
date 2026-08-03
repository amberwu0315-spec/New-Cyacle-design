import type { AnyRoute } from '@tanstack/react-router'
import { Navigate, createRoute } from '@tanstack/react-router'

import { resolveAdminHomeTo } from '@carbonnt-cyacle/web-base'
import {
  ForbiddenError,
  usePermissionGuardContext,
} from '@carbonnt-cyacle/web-uic/pub'

import { adminNavigation } from '#/admin/admin-config.ts'
import { AdminAppLayout } from '#/components/layouts/admin-layout/index.ts'

export function createAdminRoute({
  parentRoute,
}: {
  parentRoute: AnyRoute
}) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: 'admin',
    component: AdminAppLayout,
  })
}

export function createAdminHomeRoute({
  parentRoute,
}: {
  parentRoute: AnyRoute
}) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/',
    component: AdminHomeRedirect,
  })
}

function AdminHomeRedirect() {
  const { hasPermission, isLoading } = usePermissionGuardContext()

  if (isLoading) {
    return null
  }

  const permittedNavigation = adminNavigation.flatMap((group) => {
    const items = group.items.filter(
      (item) => !item.permissionCode || hasPermission(item.permissionCode),
    )

    return items.length > 0 ? [{ ...group, items }] : []
  })
  const permittedDefaultTo = resolveAdminHomeTo(permittedNavigation)

  if (permittedDefaultTo === '/admin') {
    return <ForbiddenError />
  }

  return <Navigate to={permittedDefaultTo as never} replace />
}
