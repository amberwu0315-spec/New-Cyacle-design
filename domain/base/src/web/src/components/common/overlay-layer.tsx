import * as React from "react"

const DEFAULT_DIALOG_Z_INDEX = 50
const OVERLAY_LAYER_STEP = 10

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
