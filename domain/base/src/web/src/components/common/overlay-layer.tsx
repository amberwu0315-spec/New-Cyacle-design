import * as React from "react"

/**
 * Overlay ordering is intentionally controlled by Portal DOM order. These
 * legacy numeric helpers remain exported for source compatibility with older
 * consumers, but shared overlay components no longer apply their values as
 * CSS z-indexes.
 */
const DEFAULT_DIALOG_Z_INDEX = 50
const OVERLAY_LAYER_STEP = 10
const EXPLICIT_Z_INDEX_PATTERN = /(?:^|\s)(?:[\w-]+:)*!?z-(?:\[(\d+)\]|(\d+))(?:\s|$)/

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

/** @deprecated Prefer Portal DOM order; do not use the result as a z-index. */
export function resolveOverlayLayerZIndex(defaultLayer: number, ...classNames: unknown[]) {
  for (const className of classNames) {
    if (typeof className !== "string" || !className) continue

    const match = className.match(EXPLICIT_Z_INDEX_PATTERN)
    const value = match?.[1] ?? match?.[2]

    if (value) return Number(value)
  }

  return defaultLayer
}
