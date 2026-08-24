import type { AsyncRouteComponent, RouteComponent } from "@tanstack/react-router"

/**
 * Preserves a lazy page's preload when a domain route component reads route
 * state and injects it into the page as props.
 * A getter is used because `lazyRouteComponent` clears its preload after the
 * browser loads the module.
 */
export function forwardComponentPreload<
  const TComponent extends RouteComponent,
  const TPageProps extends object,
>(Component: TComponent, Page: AsyncRouteComponent<TPageProps>): TComponent & RouteComponent {
  Object.defineProperty(Component, "preload", {
    configurable: true,
    get: () => Page.preload,
  })

  return Component
}
