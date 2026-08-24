import { createRoute, lazyRouteComponent, type AnyRoute } from '@tanstack/react-router'

const WorkbenchSidebarDemoPage = lazyRouteComponent(
  () => import('./demo-page.tsx'),
  'WorkbenchSidebarDemoPage',
)

type WorkbenchSidebarDemoRouteDeps<TParentRoute extends AnyRoute> = {
  parentRoute: TParentRoute
}

export function createWorkbenchSidebarDemoRoute<const TParentRoute extends AnyRoute>({
  parentRoute,
}: WorkbenchSidebarDemoRouteDeps<TParentRoute>) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: 'demo/workbench-sidebar',
    component: WorkbenchSidebarDemoPage,
  })
}
