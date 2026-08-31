import * as React from "react"
import { flushSync } from "react-dom"

import { AssistantResizableEmbeddedRenderer } from "#/components/assistant-workbench/ui/assistant-resizable-embedded-renderer.tsx"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog.tsx"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "#/components/ui/sheet.tsx"
import { Skeleton } from "#/components/ui/skeleton.tsx"
import { useLanguageStore } from "#/lib/i18n/language-store.ts"

export interface DataSelectorDetailDrawerItem {
  key: string
  title: React.ReactNode
  content: React.ReactNode
  onReturn?: () => void
}

export interface DataSelectorDetailDrawerHostValue {
  openDetail: (item: DataSelectorDetailDrawerItem) => void
}

export interface DataSelectorDetailDrawerProps {
  item: DataSelectorDetailDrawerItem | null
  onOpenChange: (open: boolean) => void
  widthStorageKey?: string
}

export type DataSelectorDialogLayerState = "active" | "suspended" | "hidden"

export interface DataSelectorDialogLayer {
  state: DataSelectorDialogLayerState
  modal: boolean
  disablePointerDismissal: boolean
  inert: boolean
  hidden: boolean
  /** Kept for selector compatibility; visual order now follows Portal DOM order. */
  layerClassName: string
  dialogProps: {
    open: boolean
    modal: boolean
    disablePointerDismissal: boolean
    onOpenChange: (open: boolean) => void
  }
  suspend: () => void
  resume: () => void
}

export interface DataSelectorDialogLayerOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DataSelectorDialogStackItem {
  id: string
  state: Exclude<DataSelectorDialogLayerState, "hidden">
}

const DataSelectorDetailDrawerHostContext =
  React.createContext<DataSelectorDetailDrawerHostValue | null>(null)

let dataSelectorDialogStack: Array<DataSelectorDialogStackItem> = []
const dataSelectorDialogStackListeners = new Set<() => void>()
interface DataSelectorDetailDrawerStackItem {
  id: string
  item: DataSelectorDetailDrawerItem
}

let dataSelectorDetailDrawerStack: Array<DataSelectorDetailDrawerStackItem> = []
const dataSelectorDetailDrawerStackListeners = new Set<() => void>()
let dataSelectorDetailDrawerId = 0
const dataSelectorDetailDrawerInstanceIds = new Set<string>()
let dataSelectorDetailDrawerLimitPromptOpen = false
const dataSelectorDetailDrawerLimitPromptListeners = new Set<() => void>()

const DEFAULT_DRAWER_WIDTH = 860
const MIN_DRAWER_WIDTH = 560
const VIEWPORT_GAP = 16
export const MAX_DATA_SELECTOR_DETAIL_DRAWERS = 3

function emitDataSelectorDialogStackChange() {
  dataSelectorDialogStackListeners.forEach((listener) => listener())
}

function updateDataSelectorDialogStack(
  update: (current: Array<DataSelectorDialogStackItem>) => Array<DataSelectorDialogStackItem>,
) {
  const next = update(dataSelectorDialogStack)
  if (next === dataSelectorDialogStack) return

  dataSelectorDialogStack = next
  emitDataSelectorDialogStackChange()
}

function registerDataSelectorDialog(id: string) {
  updateDataSelectorDialogStack((current) => [
    ...current
      .filter((item) => item.id !== id)
      .map((item) => (item.state === "active" ? { ...item, state: "suspended" as const } : item)),
    { id, state: "active" },
  ])
}

function unregisterDataSelectorDialog(id: string) {
  updateDataSelectorDialogStack((current) => {
    const next = current.filter((item) => item.id !== id)
    return next.length === current.length ? current : next
  })
}

function setDataSelectorDialogState(id: string, state: DataSelectorDialogStackItem["state"]) {
  updateDataSelectorDialogStack((current) => {
    let changed = false
    const next = current.map((item) => {
      const nextState =
        item.id === id
          ? state
          : state === "active" && item.state === "active"
            ? "suspended"
            : item.state
      if (nextState === item.state) return item

      changed = true
      return { ...item, state: nextState }
    })
    return changed ? next : current
  })
}

function subscribeDataSelectorDialogStack(listener: () => void) {
  dataSelectorDialogStackListeners.add(listener)
  return () => dataSelectorDialogStackListeners.delete(listener)
}

function getDataSelectorDialogStackSnapshot() {
  return dataSelectorDialogStack
}

function emitDataSelectorDetailDrawerStackChange() {
  dataSelectorDetailDrawerStackListeners.forEach((listener) => listener())
}

function emitDataSelectorDetailDrawerLimitPromptChange() {
  dataSelectorDetailDrawerLimitPromptListeners.forEach((listener) => listener())
}

function subscribeDataSelectorDetailDrawerStack(listener: () => void) {
  dataSelectorDetailDrawerStackListeners.add(listener)
  return () => dataSelectorDetailDrawerStackListeners.delete(listener)
}

function getDataSelectorDetailDrawerStackSnapshot() {
  return dataSelectorDetailDrawerStack
}

function subscribeDataSelectorDetailDrawerLimitPrompt(listener: () => void) {
  dataSelectorDetailDrawerLimitPromptListeners.add(listener)
  return () => dataSelectorDetailDrawerLimitPromptListeners.delete(listener)
}

function getDataSelectorDetailDrawerLimitPromptSnapshot() {
  return dataSelectorDetailDrawerLimitPromptOpen
}

function openDataSelectorDetailDrawer(item: DataSelectorDetailDrawerItem) {
  if (dataSelectorDetailDrawerInstanceIds.size >= MAX_DATA_SELECTOR_DETAIL_DRAWERS) {
    if (!dataSelectorDetailDrawerLimitPromptOpen) {
      dataSelectorDetailDrawerLimitPromptOpen = true
      emitDataSelectorDetailDrawerLimitPromptChange()
    }
    return
  }

  const id = `data-selector-detail-drawer-${++dataSelectorDetailDrawerId}`
  dataSelectorDetailDrawerStack = [...dataSelectorDetailDrawerStack, { id, item }]
  emitDataSelectorDetailDrawerStackChange()
}

function closeDataSelectorDetailDrawer(id: string) {
  const next = dataSelectorDetailDrawerStack.filter((entry) => entry.id !== id)
  if (next.length === dataSelectorDetailDrawerStack.length) return

  dataSelectorDetailDrawerStack = next
  emitDataSelectorDetailDrawerStackChange()
}

function getDrawerMaxWidth() {
  if (typeof window === "undefined") return 1200

  return Math.max(320, window.innerWidth - VIEWPORT_GAP)
}

export function useDataSelectorDetailDrawerHost() {
  return React.useContext(DataSelectorDetailDrawerHostContext)
}

/** Renders every nested detail as an independent Drawer in Portal open order. */
export function DataSelectorDetailDrawerStackHost() {
  const stack = React.useSyncExternalStore(
    subscribeDataSelectorDetailDrawerStack,
    getDataSelectorDetailDrawerStackSnapshot,
    getDataSelectorDetailDrawerStackSnapshot,
  )
  const limitPromptOpen = React.useSyncExternalStore(
    subscribeDataSelectorDetailDrawerLimitPrompt,
    getDataSelectorDetailDrawerLimitPromptSnapshot,
    getDataSelectorDetailDrawerLimitPromptSnapshot,
  )
  const language = useLanguageStore()

  React.useEffect(
    () => () => {
      if (dataSelectorDetailDrawerStack.length > 0) {
        dataSelectorDetailDrawerStack = []
        emitDataSelectorDetailDrawerStackChange()
      }

      dataSelectorDetailDrawerLimitPromptOpen = false
      emitDataSelectorDetailDrawerLimitPromptChange()
    },
    [],
  )

  return (
    <>
      {stack.map(({ id, item }) => (
        <DataSelectorDetailDrawer
          key={id}
          item={item}
          onOpenChange={(open) => {
            if (!open) closeDataSelectorDetailDrawer(id)
          }}
        />
      ))}
      <AlertDialog
        open={limitPromptOpen}
        onOpenChange={(open) => {
          if (!open) {
            dataSelectorDetailDrawerLimitPromptOpen = false
            emitDataSelectorDetailDrawerLimitPromptChange()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "en-US" ? "Unable to open more details" : "无法打开更多详情"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "en-US"
                ? `You can open up to ${MAX_DATA_SELECTOR_DETAIL_DRAWERS} detail drawers at a time. Close one before opening another.`
                : `最多同时打开 ${MAX_DATA_SELECTOR_DETAIL_DRAWERS} 个详情 Drawer，请关闭一个后再查看。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "en-US" ? "Got it" : "知道了"}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function useDataSelectorDialogLayer({
  open,
  onOpenChange,
}: DataSelectorDialogLayerOptions): DataSelectorDialogLayer {
  const reactId = React.useId()
  const id = React.useMemo(() => `data-selector-dialog-${reactId}`, [reactId])
  const stack = React.useSyncExternalStore(
    subscribeDataSelectorDialogStack,
    getDataSelectorDialogStackSnapshot,
    getDataSelectorDialogStackSnapshot,
  )

  React.useEffect(() => {
    if (!open) return

    registerDataSelectorDialog(id)
    return () => unregisterDataSelectorDialog(id)
  }, [id, open])

  const item = stack.find((candidate) => candidate.id === id)
  const lastSuspendedItem = React.useMemo(
    () => [...stack].reverse().find((candidate) => candidate.state === "suspended"),
    [stack],
  )
  const state: DataSelectorDialogLayerState = !open
    ? "hidden"
    : !item || item.state === "active"
      ? "active"
      : lastSuspendedItem?.id === id
        ? "suspended"
        : "hidden"

  const suspend = React.useCallback(() => {
    // Detail navigation hides the caller through React.Activity immediately.
    // Commit the non-modal lower layer first so its portal cannot stay above the drawer.
    flushSync(() => setDataSelectorDialogState(id, "suspended"))
  }, [id])
  const resume = React.useCallback(() => {
    setDataSelectorDialogState(id, "active")
  }, [id])
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      // Suspended selectors stay mounted behind the detail drawer. The drawer close
      // press and Escape key are outside interactions from the selector's point of
      // view, so they must not close the selector before it can be resumed.
      if (!nextOpen && state !== "active") return

      onOpenChange(nextOpen)
    },
    [onOpenChange, state],
  )
  const disablePointerDismissal = state !== "active"
  const modal = state === "active"

  return {
    state,
    modal,
    disablePointerDismissal,
    inert: state !== "active",
    hidden: state === "hidden",
    layerClassName: "",
    dialogProps: {
      open,
      modal,
      disablePointerDismissal,
      onOpenChange: handleOpenChange,
    },
    suspend,
    resume,
  }
}

export function DataSelectorDetailDrawer({
  item,
  onOpenChange,
  widthStorageKey = "data-selector-detail-drawer-width",
}: DataSelectorDetailDrawerProps) {
  const instanceId = React.useId()

  React.useEffect(() => {
    if (!item) return

    dataSelectorDetailDrawerInstanceIds.add(instanceId)
    return () => {
      dataSelectorDetailDrawerInstanceIds.delete(instanceId)
    }
  }, [instanceId, item])

  if (!item) return null

  return (
    <DataSelectorDetailDrawerContent
      key={item.key}
      item={item}
      widthStorageKey={widthStorageKey}
      onOpenChange={onOpenChange}
    />
  )
}

function DataSelectorDetailDrawerContent({
  item,
  onOpenChange,
  widthStorageKey,
}: Omit<DataSelectorDetailDrawerProps, "item"> & {
  item: DataSelectorDetailDrawerItem
}) {
  const language = useLanguageStore()
  const openDetail = React.useCallback((nextItem: DataSelectorDetailDrawerItem) => {
    openDataSelectorDetailDrawer(nextItem)
  }, [])
  const hostValue = React.useMemo<DataSelectorDetailDrawerHostValue>(
    () => ({ openDetail }),
    [openDetail],
  )
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) return

      item.onReturn?.()
      onOpenChange(false)
    },
    [item.onReturn, onOpenChange],
  )

  const isEnglish = language === "en-US"
  const maxWidth = getDrawerMaxWidth()
  const minWidth = Math.min(MIN_DRAWER_WIDTH, maxWidth)

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="!w-auto gap-0 overflow-hidden p-0 sm:!max-w-none">
        <AssistantResizableEmbeddedRenderer
          open
          defaultWidth={Math.min(DEFAULT_DRAWER_WIDTH, maxWidth)}
          minWidth={minWidth}
          maxWidth={maxWidth}
          resizeHandleAriaLabel={isEnglish ? "Resize details panel" : "调整详情面板宽度"}
          widthStorageKey={widthStorageKey}
          className="h-full min-h-0 max-w-[calc(100vw-16px)]"
        >
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className="shrink-0 border-b px-5 py-4 pr-14">
              <div className="flex items-center gap-2">
                <SheetTitle>{item.title}</SheetTitle>
              </div>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DataSelectorDetailDrawerHostContext.Provider value={hostValue}>
                <React.Suspense fallback={<Skeleton className="m-5 h-80" />}>
                  {item.content}
                </React.Suspense>
              </DataSelectorDetailDrawerHostContext.Provider>
            </div>
          </div>
        </AssistantResizableEmbeddedRenderer>
      </SheetContent>
    </Sheet>
  )
}
