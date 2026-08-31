// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  OverlayLayerScope,
  resolveOverlayLayerZIndex,
  useOverlayLayer,
} from "./overlay-layer.tsx"

function LayerProbe({ name }: { name: string }) {
  const layer = useOverlayLayer()

  return (
    <output data-testid={name}>
      {layer.baseLayer}:{layer.contentLayer}:{layer.overlayLayer}
    </output>
  )
}

describe("OverlayLayerScope", () => {
  it("derives nested dialog layers from the current container", () => {
    render(
      <OverlayLayerScope baseLayer={70}>
        <LayerProbe name="drawer-dialog" />
        <OverlayLayerScope baseLayer={80}>
          <LayerProbe name="nested-dialog" />
        </OverlayLayerScope>
      </OverlayLayerScope>,
    )

    expect(screen.getByTestId("drawer-dialog").textContent).toBe("70:80:80")
    expect(screen.getByTestId("nested-dialog").textContent).toBe("80:90:90")
  })

  it("keeps dialogs outside an overlay scope at the default layer", () => {
    render(<LayerProbe name="default-dialog" />)

    expect(screen.getByTestId("default-dialog").textContent).toBe("0:50:50")
  })

  it("lets floating content derive the next layer from its container", () => {
    expect(resolveOverlayLayerZIndex(50)).toBe(50)
    expect(resolveOverlayLayerZIndex(80)).toBe(80)
  })

  it("preserves explicit utility-class layer overrides", () => {
    expect(resolveOverlayLayerZIndex(60, "w-80 z-[90] p-0")).toBe(90)
    expect(resolveOverlayLayerZIndex(60, "sm:!z-80 w-80")).toBe(80)
    expect(resolveOverlayLayerZIndex(60, null, "z-70")).toBe(70)
  })
})
