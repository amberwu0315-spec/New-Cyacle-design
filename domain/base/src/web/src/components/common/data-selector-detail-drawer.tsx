import * as React from 'react'
import { flushSync } from 'react-dom'
import { ArrowLeft } from 'lucide-react'

import { AssistantResizableEmbeddedRenderer } from '#/components/assistant-workbench/ui/assistant-resizable-embedded-renderer.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '#/components/ui/sheet.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { OverlayLayerScope } from '#/components/common/overlay-layer.tsx'
import { useLanguageStore } from '#/lib/i18n/language-store.ts'

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

export type DataSelectorDialogLayerState = 'active' | 'suspended' | 'hidden'

export interface DataSelectorDialogLayer {
  state: DataSelectorDialogLayerState
  modal: boolean
  disablePointerDismissal: boolean
  inert: boolean
  hidden: boolean
  layerClassName: 'z-[60]' | 'z-[80]'
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
  state: Exclude<DataSelectorDialogLayerState, 'hidden'>
}

const DataSelectorDetailDrawerHostContext =
  React.createContext<DataSelectorDetailDrawerHostValue | null>(null)

let dataSelectorDialogStack: Array<DataSelectorDialogStackItem> = []
const dataSelectorDialogStackListeners = new Set<() => void>()

const DEFAULT_DRAWER_WIDTH = 860
const MIN_DRAWER_WIDTH = 560
const VIEWPORT_GAP = 16

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
      .map((item) => (item.state === 'active' ? { ...item, state: 'suspended' as const } : item)),
    { id, state: 'active' },
  ])
}

function unregisterDataSelectorDialog(id: string) {
  updateDataSelectorDialogStack((current) => {
    const next = current.filter((item) => item.id !== id)
    return next.length === current.length ? current : next
  })
}

function setDataSelectorDialogState(id: string, state: DataSelectorDialogStackItem['state']) {
  updateDataSelectorDialogStack((current) => {
    let changed = false
    const next = current.map((item) => {
      const nextState =
        item.id === id
          ? state
          : state === 'active' && item.state === 'active'
            ? 'suspended'
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

function getDrawerMaxWidth() {
  if (typeof window === 'undefined') return 1200

  return Math.max(320, window.innerWidth - VIEWPORT_GAP)
}

export function useDataSelectorDetailDrawerHost() {
  return React.useContext(DataSelectorDetailDrawerHostContext)
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
    () => [...stack].reverse().find((candidate) => candidate.state === 'suspended'),
    [stack],
  )
  const state: DataSelectorDialogLayerState = !open
    ? 'hidden'
    : !item || item.state === 'active'
      ? 'active'
      : lastSuspendedItem?.id === id
        ? 'suspended'
        : 'hidden'

  const suspend = React.useCallback(() => {
    // Detail navigation hides the caller through React.Activity immediately.
    // Commit the non-modal lower layer first so its portal cannot stay above the drawer.
    flushSync(() => setDataSelectorDialogState(id, 'suspended'))
  }, [id])
  const resume = React.useCallback(() => {
    setDataSelectorDialogState(id, 'active')
  }, [id])
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      // Suspended selectors stay mounted behind the detail drawer. The drawer close
      // press and Escape key are outside interactions from the selector's point of
      // view, so they must not close the selector before it can be resumed.
      if (!nextOpen && state !== 'active') return

      onOpenChange(nextOpen)
    },
    [onOpenChange, state],
  )
  const disablePointerDismissal = state !== 'active'
  const modal = state === 'active'

  return {
    state,
    modal,
    disablePointerDismissal,
    inert: state !== 'active',
    hidden: state === 'hidden',
    layerClassName: state === 'active' ? 'z-[80]' : 'z-[60]',
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
  widthStorageKey = 'data-selector-detail-drawer-width',
}: DataSelectorDetailDrawerProps) {
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
}: Omit<DataSelectorDetailDrawerProps, 'item'> & {
  item: DataSelectorDetailDrawerItem
}) {
  const language = useLanguageStore()
  const [nestedItems, setNestedItems] = React.useState<Array<DataSelectorDetailDrawerItem>>([])

  const openDetail = React.useCallback((nextItem: DataSelectorDetailDrawerItem) => {
    setNestedItems((current) => [...current, nextItem])
  }, [])
  const hostValue = React.useMemo<DataSelectorDetailDrawerHostValue>(
    () => ({ openDetail }),
    [openDetail],
  )
  const detailItems = React.useMemo(() => [item, ...nestedItems], [item, nestedItems])
  const currentItem = detailItems[detailItems.length - 1]
  const handleBack = React.useCallback(() => {
    const returningItem = nestedItems[nestedItems.length - 1]
    if (!returningItem) return

    setNestedItems((current) => current.slice(0, -1))
    returningItem.onReturn?.()
  }, [nestedItems])
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) return
      if (nestedItems.length) {
        handleBack()
        return
      }

      item.onReturn?.()
      onOpenChange(false)
    },
    [handleBack, item.onReturn, nestedItems.length, onOpenChange],
  )

  const isEnglish = language === 'en-US'
  const maxWidth = getDrawerMaxWidth()
  const minWidth = Math.min(MIN_DRAWER_WIDTH, maxWidth)

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="z-[70] !w-auto gap-0 overflow-hidden p-0 sm:!max-w-none"
      >
        <OverlayLayerScope baseLayer={70}>
          <AssistantResizableEmbeddedRenderer
            open
            defaultWidth={Math.min(DEFAULT_DRAWER_WIDTH, maxWidth)}
            minWidth={minWidth}
            maxWidth={maxWidth}
            resizeHandleAriaLabel={isEnglish ? 'Resize details panel' : '调整详情面板宽度'}
            widthStorageKey={widthStorageKey}
            className="h-full min-h-0 max-w-[calc(100vw-16px)]"
          >
            <div className="flex h-full min-h-0 flex-col">
              <SheetHeader className="shrink-0 border-b px-5 py-4 pr-14">
                <div className="flex items-center gap-2">
                  {nestedItems.length ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      title={isEnglish ? 'Back' : '返回'}
                      aria-label={isEnglish ? 'Back' : '返回'}
                      onClick={handleBack}
                    >
                      <ArrowLeft />
                    </Button>
                  ) : null}
                  <SheetTitle>{currentItem.title}</SheetTitle>
                </div>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <DataSelectorDetailDrawerHostContext.Provider value={hostValue}>
                  <React.Suspense fallback={<Skeleton className="m-5 h-80" />}>
                    {detailItems.map((detailItem, index) => {
                      const isCurrent = index === detailItems.length - 1

                      return (
                        <div
                          key={`${detailItem.key}:${index}`}
                          aria-hidden={isCurrent ? undefined : true}
                          style={isCurrent ? undefined : { display: 'none' }}
                        >
                          {detailItem.content}
                        </div>
                      )
                    })}
                  </React.Suspense>
                </DataSelectorDetailDrawerHostContext.Provider>
              </div>
            </div>
          </AssistantResizableEmbeddedRenderer>
        </OverlayLayerScope>
      </SheetContent>
    </Sheet>
  )
}
