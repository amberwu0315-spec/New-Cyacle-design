import type { AnyRoute } from '@tanstack/react-router'
import { createRoute, redirect } from '@tanstack/react-router'

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
  defaultTo,
  parentRoute,
}: {
  defaultTo: string
  parentRoute: AnyRoute
}) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/',
    beforeLoad: () => {
      if (defaultTo === '/admin') {
        return
      }

      throw redirect({ to: defaultTo as never })
    },
  })
}
