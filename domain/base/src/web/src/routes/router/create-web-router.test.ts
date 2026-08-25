import { createRootRoute, createRoute, type AnyRoute, type LinkProps } from "@tanstack/react-router"
import { describe, expect, it } from "vitest"

import { createWebDomain } from "../domain/builder.ts"
import { createWebRouter } from "./create-web-router.ts"

function createRootOutlets<const TRootRoute extends AnyRoute>(rootRoute: TRootRoute) {
  return {
    app: createRoute({
      getParentRoute: () => rootRoute,
      id: "app",
    }),
    admin: createRoute({
      getParentRoute: () => rootRoute,
      id: "admin",
    }),
  }
}

/** This is the public domain boundary for an externally maintained factory. */
function createExternalOrderRoutes(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: "external-orders/$orderId",
  })
}

describe("createWebRouter", () => {
  it("adds arbitrary app-owned routes to their outlet", () => {
    const rootRoute = createRootRoute()
    const { router } = createWebRouter({
      rootRoute,
      rootOutlets: createRootOutlets(rootRoute),
      domains: [],
      routes: ({ app }) => ({
        app: [
          createRoute({
            getParentRoute: () => app,
            path: "/",
          }),
          createRoute({
            getParentRoute: () => app,
            path: "settings/$sectionId",
          }),
        ],
      }),
    })

    expect(router.routesByPath["/"]).toBeDefined()
    expect(router.routesByPath["/settings/$sectionId"]).toBeDefined()

    if (false) {
      const validLink = {
        to: "/settings/$sectionId",
        params: { sectionId: "profile" },
      } satisfies LinkProps<"a", typeof router, string, "/settings/$sectionId">
      const invalidParams = {
        to: "/settings/$sectionId",
        // @ts-expect-error Inline app-owned routes preserve their path-param contract.
        params: { missing: "profile" },
      } satisfies LinkProps<"a", typeof router, string, "/settings/$sectionId">
      // @ts-expect-error App-owned routes outside the callback result are absent.
      const invalidLink = { to: "/missing" } satisfies LinkProps<
        "a",
        typeof router,
        string,
        "/missing"
      >
      expect(validLink).toBeDefined()
      expect(invalidParams).toBeDefined()
      expect(invalidLink).toBeDefined()
    }
  })

  it("provides defaults and accepts Router option overrides", () => {
    const rootRoute = createRootRoute()
    const overriddenRootRoute = createRootRoute()
    const defaults = createWebRouter({
      rootRoute,
      rootOutlets: createRootOutlets(rootRoute),
      domains: [],
    }).router
    const overridden = createWebRouter({
      rootRoute: overriddenRootRoute,
      rootOutlets: createRootOutlets(overriddenRootRoute),
      domains: [],
      router: {
        defaultPreload: false,
        defaultPreloadStaleTime: 30_000,
        scrollRestoration: false,
      },
    }).router

    expect(defaults.options.defaultPreload).toBe("intent")
    expect(defaults.options.defaultPreloadStaleTime).toBe(0)
    expect(defaults.options.scrollRestoration).toBe(true)
    expect(overridden.options.defaultPreload).toBe(false)
    expect(overridden.options.defaultPreloadStaleTime).toBe(30_000)
    expect(overridden.options.scrollRestoration).toBe(false)
  })

  it("preserves domain route params across multiple root outlets", () => {
    const rootRoute = createRootRoute()
    const domain = createWebDomain("orders")
      .addRoute("app", (parentRoute) =>
        createRoute({
          getParentRoute: () => parentRoute,
          path: "orders/$orderId",
        }),
      )
      .addRoute("admin", (parentRoute) =>
        createRoute({
          getParentRoute: () => parentRoute,
          path: "admin/orders/$orderId",
        }),
      )
    const users = createWebDomain("users").addRoute("app", (parentRoute) =>
      createRoute({
        getParentRoute: () => parentRoute,
        path: "users",
      }),
    )
    const { router } = createWebRouter({
      rootRoute,
      rootOutlets: {
        app: createRoute({
          getParentRoute: () => rootRoute,
          id: "app",
        }),
        admin: createRoute({
          getParentRoute: () => rootRoute,
          id: "admin",
        }),
      },
      domains: [domain, users],
    })

    expect(router.routesByPath["/orders/$orderId"]).toBeDefined()
    expect(router.routesByPath["/admin/orders/$orderId"]).toBeDefined()

    if (false) {
      const validLink = {
        to: "/orders/$orderId",
        params: { orderId: "123" },
      } satisfies LinkProps<"a", typeof router, string, "/orders/$orderId">
      const validAdminLink = {
        to: "/admin/orders/$orderId",
        params: { orderId: "123" },
      } satisfies LinkProps<"a", typeof router, string, "/admin/orders/$orderId">
      expect(validLink).toBeDefined()
      expect(validAdminLink).toBeDefined()
    }
  })

  it("supports an external AnyRoute factory without losing app path params", () => {
    const rootRoute = createRootRoute()
    const externalDomain = createWebDomain("external-order").addRoute(
      "app",
      createExternalOrderRoutes,
    )
    const { router } = createWebRouter({
      rootRoute,
      rootOutlets: {
        app: createRoute({
          getParentRoute: () => rootRoute,
          id: "app",
        }),
        admin: createRoute({
          getParentRoute: () => rootRoute,
          id: "admin",
        }),
      },
      domains: [externalDomain],
    })

    expect(router.routesByPath["/external-orders/$orderId"]).toBeDefined()

    if (false) {
      const validLink = {
        to: "/external-orders/$orderId",
        params: { orderId: "123" },
      } satisfies LinkProps<"a", typeof router, string, "/external-orders/$orderId">
      const invalidParams = {
        to: "/external-orders/$orderId",
        // @ts-expect-error The extracted factory still rejects an unrelated param.
        params: { userId: "123" },
      } satisfies LinkProps<"a", typeof router, string, "/external-orders/$orderId">
      void validLink
      void invalidParams
    }
  })

  it("supports a root-only Router with explicitly disabled outlets", () => {
    const rootRoute = createRootRoute()
    const yaoming = createWebDomain("yaoming").addRoute("root", (parentRoute) =>
      createRoute({
        getParentRoute: () => parentRoute,
        path: "yaoming/$pageId",
      }),
    )
    const webRouter = createWebRouter({
      rootRoute,
      rootOutlets: {
        app: null,
        admin: null,
      },
      domains: [yaoming],
      routes: ({ app, admin }) => {
        expect(app).toBeNull()
        expect(admin).toBeNull()
        return {}
      },
    })

    expect(webRouter.outlets.app).toBeNull()
    expect(webRouter.outlets.admin).toBeNull()
    expect(webRouter.router.routesByPath["/yaoming/$pageId"]).toBeDefined()

    if (false) {
      const validLink = {
        to: "/yaoming/$pageId",
        params: { pageId: "home" },
      } satisfies LinkProps<"a", typeof webRouter.router, string, "/yaoming/$pageId">
      // @ts-expect-error Disabled outlets do not leak routes into a static root-only Router.
      const invalidLink = { to: "/settings" } satisfies LinkProps<
        "a",
        typeof webRouter.router,
        string,
        "/settings"
      >
      expect(validLink).toBeDefined()
      expect(invalidLink).toBeDefined()
    }
  })

  it("supports runtime outlet orchestration", () => {
    const rootRoute = createRootRoute()
    const hasYaoming = Boolean("yaoming")
    const rootOutlets = hasYaoming ? { app: null, admin: null } : createRootOutlets(rootRoute)
    const yaoming = createWebDomain("yaoming").addRoute("root", (parentRoute) =>
      createRoute({
        getParentRoute: () => parentRoute,
        path: "yaoming",
      }),
    )

    const webRouter = createWebRouter({
      rootRoute,
      rootOutlets,
      domains: [yaoming],
      routes: ({ app }) => {
        if (app === null) {
          return {}
        }

        const homeRoute = createRoute({
          getParentRoute: () => app,
          path: "/",
        })

        return { app: [homeRoute] }
      },
    })

    expect(webRouter.outlets.app).toBeNull()
    expect(webRouter.router.routesByPath["/yaoming"]).toBeDefined()
  })

  it("rejects children assigned to a disabled outlet", () => {
    const rootRoute = createRootRoute()
    const orphanRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "orphan",
    })

    expect(() =>
      createWebRouter({
        rootRoute,
        rootOutlets: {
          app: null,
          admin: null,
        },
        domains: [],
        routes: () => ({ app: [orphanRoute] }),
      }),
    ).toThrowError('Disabled web domain outlet "app" has child routes')
  })

  it("rejects a root outlet attached to another root route", () => {
    const rootRoute = createRootRoute()
    const otherRootRoute = createRootRoute()
    const app = createRoute({
      getParentRoute: () => otherRootRoute,
      id: "app",
    })

    expect(() =>
      createWebRouter({
        rootRoute,
        rootOutlets: { app, admin: null },
        domains: [],
      }),
    ).toThrowError(
      'Root outlet "app" is attached to a different parent route than the one supplied by the host',
    )
  })

  it("rejects an app-owned route assigned to the wrong outlet", () => {
    const rootRoute = createRootRoute()
    const app = createRoute({
      getParentRoute: () => rootRoute,
      id: "app",
    })
    const routeOwnedByRoot = createRoute({
      getParentRoute: () => rootRoute,
      path: "orphan",
    })

    expect(() =>
      createWebRouter({
        rootRoute,
        rootOutlets: { app, admin: null },
        domains: [],
        routes: () => ({ app: [routeOwnedByRoot] }),
      }),
    ).toThrowError(
      'App-owned route "orphan" outlet "app" is attached to a different parent route than the one supplied by the host',
    )
  })
})

if (false) {
  const rootRoute = createRootRoute()
  const app = createRoute({
    getParentRoute: () => rootRoute,
    id: "app",
  })
  const admin = createRoute({
    getParentRoute: () => rootRoute,
    id: "admin",
  })
  const appDomain = createWebDomain("feature").addRoute("app", (parentRoute) =>
    createRoute({
      getParentRoute: () => parentRoute,
      path: "feature",
    }),
  )

  createWebRouter({
    rootRoute,
    domains: [],
    // @ts-expect-error Every configured root outlet must be explicit, using a Route or null.
    rootOutlets: { app },
  })

  createWebRouter({
    rootRoute,
    domains: [],
    rootOutlets: {
      app,
      // @ts-expect-error An outlet Route's id must match its registry key.
      admin: createRoute({
        getParentRoute: () => rootRoute,
        path: "admin",
      }),
    },
  })

  createWebRouter({
    rootRoute,
    domains: [],
    // @ts-expect-error Unknown root outlets are rejected.
    rootOutlets: { app, admin, workspace: admin },
  })

  createWebRouter({
    rootRoute,
    domains: [appDomain],
    rootOutlets: {
      // @ts-expect-error A statically disabled outlet cannot be used by an active domain.
      app: null,
      admin: null,
    },
  })

  createWebRouter({
    rootRoute,
    domains: [],
    rootOutlets: { app, admin },
    // @ts-expect-error App-owned routes can only target registered outlets.
    routes: () => ({ app: [], workspace: [] }),
  })
}
