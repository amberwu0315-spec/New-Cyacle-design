import type { AsyncRouteComponent } from "@tanstack/react-router"
import { describe, expect, it, vi } from "vitest"

import { forwardComponentPreload } from "./route-component.ts"

describe("forwardComponentPreload", () => {
  it("exposes the page's current preload function", async () => {
    const preload = vi.fn(async () => undefined)
    const Page: AsyncRouteComponent<{ itemId: string }> = () => null
    Page.preload = preload
    const RouteComponent = () => null

    const forwardedComponent = forwardComponentPreload(RouteComponent, Page)

    expect(forwardedComponent).toBe(RouteComponent)
    expect(forwardedComponent.preload).toBe(preload)
    await forwardedComponent.preload?.()
    expect(preload).toHaveBeenCalledOnce()

    Page.preload = undefined
    expect(forwardedComponent.preload).toBeUndefined()
  })
})
