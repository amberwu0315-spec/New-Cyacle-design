import { createRoute } from "@tanstack/react-router"
import { describe, expect, it } from "vitest"

import { createWebDomain } from "../domain/builder.ts"
import { createStandaloneWebDomainRouter } from "./standalone-router.ts"

describe("createStandaloneWebDomainRouter", () => {
  it("creates a real router containing only the domain route tree", () => {
    const domain = createWebDomain("catalog")
      .addRoute("app", (parentRoute) =>
        createRoute({
          getParentRoute: () => parentRoute,
          path: "catalog/$itemId",
        }),
      )
      .addRoute("admin", (parentRoute) =>
        createRoute({
          getParentRoute: () => parentRoute,
          path: "admin/catalog",
        }),
      )

    const router = createStandaloneWebDomainRouter(domain)

    expect(router.routesByPath["/catalog/$itemId"]).toBeDefined()
    expect(router.routesByPath["/admin/catalog"]).toBeDefined()
  })
})
