import type { AnyRoute } from "@tanstack/react-router"

/**
 * Route factories are allowed to be compiled independently from the app, but
 * the concrete Route instance must still be attached to the parent supplied by
 * the host at collection time.
 */
export function assertWebRouteParent(route: AnyRoute, parentRoute: AnyRoute, owner: string) {
  const routeOptions = route.options

  if (!routeOptions) {
    // Keep this guard tolerant of test doubles and JavaScript callers.
    return
  }

  const getParentRoute = routeOptions.getParentRoute

  if (typeof getParentRoute !== "function") {
    throw new Error(`${owner} does not expose a parent route`)
  }

  let actualParent: AnyRoute | undefined

  try {
    actualParent = getParentRoute()
  } catch (error) {
    throw new Error(`${owner} could not resolve its parent route`, { cause: error })
  }

  if (actualParent !== parentRoute) {
    throw new Error(
      `${owner} is attached to a different parent route than the one supplied by the host`,
    )
  }
}

export function describeWebRoute(route: AnyRoute) {
  const options = route.options as { readonly id?: unknown; readonly path?: unknown }
  return options.id ?? options.path ?? route.id ?? "anonymous"
}
