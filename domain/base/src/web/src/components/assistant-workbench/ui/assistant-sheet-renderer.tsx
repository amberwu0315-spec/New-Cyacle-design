'use client'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet.tsx'
import { useOptionalI18n } from '#/components/assistant-workbench/i18n/index.ts'
import { cn } from '#/lib/utils.ts'
import { AssistantPanelContent } from './assistant-panel-content'
import type { AssistantPanelContentProps } from '../model/types'

export interface AssistantSheetRendererProps
  extends AssistantPanelContentProps {
  open: boolean
  hidden?: boolean
  onOpenChange: (open: boolean) => void
  panelAriaLabel?: string
  panelDescription?: string
  panelClassName?: string
}

export function AssistantSheetRenderer({
  open,
  hidden = false,
  onOpenChange,
  panelAriaLabel,
  panelDescription,
  panelClassName,
  ...contentProps
}: AssistantSheetRendererProps) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench

  if (hidden) {
    return null
  }

  const resolvedPanelAriaLabel =
    panelAriaLabel ?? assistantMessages.brand.panelTitle
  const resolvedPanelDescription =
    panelDescription ?? assistantMessages.brand.sheetPanelDescription

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn('flex flex-col gap-0 p-0 sm:max-w-xl', panelClassName)}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{resolvedPanelAriaLabel}</SheetTitle>
          <SheetDescription>{resolvedPanelDescription}</SheetDescription>
        </SheetHeader>

        <AssistantPanelContent
          {...contentProps}
          className={cn('h-full rounded-none border-0', contentProps.className)}
        />
      </SheetContent>
    </Sheet>
  )
}
