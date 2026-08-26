import * as React from "react"
import { ArrowLeft } from "lucide-react"

import { AssistantResizableEmbeddedRenderer } from "#/components/assistant-workbench/ui/assistant-resizable-embedded-renderer.tsx"
import { Button } from "#/components/ui/button.tsx"
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

const DataSelectorDetailDrawerHostContext =
  React.createContext<DataSelectorDetailDrawerHostValue | null>(null)

const DEFAULT_DRAWER_WIDTH = 860
const MIN_DRAWER_WIDTH = 560
const VIEWPORT_GAP = 16

function getDrawerMaxWidth() {
  if (typeof window === "undefined") return 1200

  return Math.max(320, window.innerWidth - VIEWPORT_GAP)
}

export function useDataSelectorDetailDrawerHost() {
  return React.useContext(DataSelectorDetailDrawerHostContext)
}

export function DataSelectorDetailDrawer({
  item,
  onOpenChange,
  widthStorageKey = "data-selector-detail-drawer-width",
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
}: Omit<DataSelectorDetailDrawerProps, "item"> & {
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

      onOpenChange(false)
    },
    [handleBack, nestedItems.length, onOpenChange],
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
                {nestedItems.length ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    title={isEnglish ? "Back" : "返回"}
                    aria-label={isEnglish ? "Back" : "返回"}
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
                  {detailItems.map((detailItem, index) => (
                    <React.Activity
                      key={`${detailItem.key}:${index}`}
                      mode={index === detailItems.length - 1 ? "visible" : "hidden"}
                    >
                      {detailItem.content}
                    </React.Activity>
                  ))}
                </React.Suspense>
              </DataSelectorDetailDrawerHostContext.Provider>
            </div>
          </div>
        </AssistantResizableEmbeddedRenderer>
      </SheetContent>
    </Sheet>
  )
}
