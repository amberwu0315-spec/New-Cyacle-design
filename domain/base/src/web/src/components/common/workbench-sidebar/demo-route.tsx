import { createRoute, lazyRouteComponent } from '@tanstack/react-router'

import type { WebRouteHandle } from '../../../routes/web-domain.ts'

const WorkbenchSidebarDemoPage = lazyRouteComponent(
  () => import('./demo-page.tsx'),
  'WorkbenchSidebarDemoPage',
)

type WorkbenchSidebarDemoRouteDeps = {
  parentRoute: WebRouteHandle
}

export function createWorkbenchSidebarDemoRoute({
  parentRoute,
}: WorkbenchSidebarDemoRouteDeps) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: 'demo/workbench-sidebar',
    component: WorkbenchSidebarDemoPage,
  })
}
