import { createRootRoute, createRoute, type AnyRoute } from "@tanstack/react-router"
import { describe, expect, it } from "vitest"

import {
  collectWebDomainCapabilityEntries,
  collectWebDomainCapabilities,
  collectWebDomainRoutes,
  collectWebDomains,
} from "./collect.ts"
import { createWebDomain } from "./builder.ts"

function route(id: string): AnyRoute {
  return { id } as AnyRoute
}

function outlets() {
  return {
    root: route("root"),
    app: route("app"),
    admin: route("admin"),
  }
}

describe("web domain collection", () => {
  it("collects routes by outlet and capabilities by key", () => {
    const { app, root } = outlets()
    const firstRoute = route("first")
    const secondRoute = route("second")
    const rootRoute = route("root-child")
    const first = createWebDomain("first")
      .addRoute("app", (parent) => {
        expect(parent).toBe(app)
        return firstRoute
      })
      .addRoute("app", (parent) => {
        expect(parent).toBe(app)
        return secondRoute
      })
      .addCapability("navigation", { label: "First", to: "/first" })
    const second = createWebDomain("second").addRoute("root", (parent) => {
      expect(parent).toBe(root)
      return rootRoute
    })
    const domains = [first, second]

    expect(collectWebDomainRoutes(domains, "app", app)).toEqual([firstRoute, secondRoute])
    expect(collectWebDomainRoutes(domains, "root", root)).toEqual([rootRoute])
    expect(collectWebDomainCapabilities(domains, "navigation")).toEqual([
      { label: "First", to: "/first" },
    ])
    expect(collectWebDomainCapabilityEntries(domains, "navigation")).toEqual([
      {
        domainId: "first",
        capability: { label: "First", to: "/first" },
      },
    ])
  })

  it("collects every registered outlet in one operation", () => {
    const outletRoutes = outlets()
    const featureRoute = route("feature")
    const domain = createWebDomain("feature").addRoute("app", (parent) => {
      expect(parent).toBe(outletRoutes.app)
      return featureRoute
    })

    const collected = collectWebDomains([domain], outletRoutes)

    expect(collected.routes.root).toEqual([])
    expect(collected.routes.app).toEqual([featureRoute])
    expect(collected.routes.admin).toEqual([])
  })

  it("allows explicitly disabled outlets for root-only domains", () => {
    const rootRoute = route("root")
    const yaomingRoute = route("yaoming")
    const domain = createWebDomain("yaoming").addRoute("root", (parent) => {
      expect(parent).toBe(rootRoute)
      return yaomingRoute
    })

    const collected = collectWebDomains([domain], {
      root: rootRoute,
      app: null,
      admin: null,
    })

    expect(collected.routes.root).toEqual([yaomingRoute])
    expect(collected.routes.app).toEqual([])
    expect(collected.routes.admin).toEqual([])
  })

  it("rejects a domain route targeting a disabled outlet", () => {
    const domain = createWebDomain("feature").addRoute("app", () => route("feature"))

    expect(() =>
      collectWebDomains([domain], {
        root: route("root"),
        app: null,
        admin: null,
      }),
    ).toThrowError('Disabled web domain outlet "app" is used by domains: feature')
  })

  it("rejects duplicate domain ids", () => {
    const duplicate = createWebDomain("same")

    expect(() => collectWebDomains([duplicate, duplicate], outlets())).toThrowError(
      "Duplicate web domain: same",
    )
  })

  it("rejects a missing registered outlet at runtime", () => {
    expect(() =>
      collectWebDomains([], {
        root: route("root"),
        app: route("app"),
      } as any),
    ).toThrowError("Missing web domain outlets: admin")
  })

  it("rejects an unknown outlet at runtime", () => {
    expect(() =>
      collectWebDomains([], {
        ...outlets(),
        typo: route("typo"),
      } as any),
    ).toThrowError("Unknown web domain outlets: typo")
  })

  it("rejects an unknown domain route outlet at runtime", () => {
    const domain = createWebDomain("feature") as any
    domain.routes = [{ outlet: "typo", factory: () => route("feature") }]

    expect(() => collectWebDomains([domain], outlets())).toThrowError(
      "Unknown domain route outlets: typo",
    )
  })

  it("rejects a domain route whose factory ignores the supplied parent", () => {
    const rootRoute = createRootRoute()
    const appRoute = createRoute({
      getParentRoute: () => rootRoute,
      id: "app",
    })
    const adminRoute = createRoute({
      getParentRoute: () => rootRoute,
      id: "admin",
    })
    const otherRootRoute = createRootRoute()
    const otherParent = createRoute({
      getParentRoute: () => otherRootRoute,
      id: "other-parent",
    })
    const domain = createWebDomain("feature").addRoute("app", () =>
      createRoute({
        getParentRoute: () => otherParent,
        path: "feature",
      }),
    )

    expect(() =>
      collectWebDomains([domain], {
        root: rootRoute,
        app: appRoute,
        admin: adminRoute,
      }),
    ).toThrowError(
      'Domain "feature" outlet "app" is attached to a different parent route than the one supplied by the host',
    )
  })

  it("does not collect inherited capability properties", () => {
    const domain = createWebDomain("feature")

    expect(collectWebDomainCapabilities([domain], "toString" as never)).toEqual([])
  })

  it("rejects undefined capabilities at runtime", () => {
    expect(() =>
      (createWebDomain("feature") as any).addCapability("navigation", undefined),
    ).toThrowError('Web domain capability "navigation" cannot be undefined')
  })
})

if (false) {
  const parent = route("parent")
  const domain = createWebDomain("feature").addRoute("app", () => route("feature"))

  // @ts-expect-error Domain routes can only target registered outlets.
  createWebDomain("invalid").addRoute("workspace", () => route("workspace"))

  // @ts-expect-error Every registered outlet is required.
  collectWebDomains([domain], { root: parent, app: parent })

  collectWebDomains([domain], {
    root: parent,
    app: parent,
    admin: parent,
    // @ts-expect-error Unknown outlets are rejected.
    typo: parent,
  })
}
