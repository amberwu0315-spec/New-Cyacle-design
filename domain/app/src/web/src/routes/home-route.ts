import type { AnyRoute } from '@tanstack/react-router'
import { createRoute, lazyRouteComponent } from '@tanstack/react-router'

const AppHomePage = lazyRouteComponent(
  () => import('../features/home/page'),
  'AppHomePage',
)

type HomeRouteDeps = {
  RootRoute: AnyRoute
}

export function createHomeRouteTree({ RootRoute }: HomeRouteDeps) {
  return createRoute({
    getParentRoute: () => RootRoute,
    path: '/',
    component: AppHomePage,
  })
}
