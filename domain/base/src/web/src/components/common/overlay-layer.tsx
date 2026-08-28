import * as React from "react"

const DEFAULT_DIALOG_Z_INDEX = 50
const OVERLAY_LAYER_STEP = 10
const EXPLICIT_Z_INDEX_PATTERN =
  /(?:^|\s)(?:[\w-]+:)*!?z-(?:\[(\d+)\]|(\d+))(?:\s|$)/

const OverlayLayerContext = React.createContext(0)

export function OverlayLayerScope({
  baseLayer,
  children,
}: {
  baseLayer: number
  children: React.ReactNode
}) {
  return <OverlayLayerContext.Provider value={baseLayer}>{children}</OverlayLayerContext.Provider>
}

export function useOverlayLayer() {
  const baseLayer = React.useContext(OverlayLayerContext)
  const contentLayer = baseLayer > 0 ? baseLayer + OVERLAY_LAYER_STEP : DEFAULT_DIALOG_Z_INDEX

  return {
    baseLayer,
    contentLayer,
    overlayLayer: contentLayer,
  }
}

export function resolveOverlayLayerZIndex(
  defaultLayer: number,
  ...classNames: unknown[]
) {
  for (const className of classNames) {
    if (typeof className !== "string" || !className) continue

    const match = className.match(EXPLICIT_Z_INDEX_PATTERN)
    const value = match?.[1] ?? match?.[2]

    if (value) return Number(value)
  }

  return defaultLayer
}
