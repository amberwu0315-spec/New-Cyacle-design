'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { useOptionalI18n } from '#/components/assistant-workbench/i18n/index.ts'
import { cn } from '#/lib/utils.ts'
import { AssistantPanelContent } from './assistant-panel-content'
import type { AssistantPanelContentProps } from '../model/types'

export interface AssistantDialogRendererProps
  extends AssistantPanelContentProps {
  open: boolean
  hidden?: boolean
  onOpenChange: (open: boolean) => void
  panelAriaLabel?: string
  panelDescription?: string
  panelClassName?: string
}

export function AssistantDialogRenderer({
  open,
  hidden = false,
  onOpenChange,
  panelAriaLabel,
  panelDescription,
  panelClassName,
  ...contentProps
}: AssistantDialogRendererProps) {
  const { messages } = useOptionalI18n()
  const assistantMessages = messages.assistantWorkbench

  if (hidden) {
    return null
  }

  const resolvedPanelAriaLabel =
    panelAriaLabel ?? assistantMessages.brand.panelTitle
  const resolvedPanelDescription =
    panelDescription ?? assistantMessages.brand.dialogPanelDescription

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'flex h-[88vh] max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:!max-w-[960px]',
          panelClassName,
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{resolvedPanelAriaLabel}</DialogTitle>
          <DialogDescription>{resolvedPanelDescription}</DialogDescription>
        </DialogHeader>

        <AssistantPanelContent
          {...contentProps}
          className={cn('h-full rounded-none border-0', contentProps.className)}
        />
      </DialogContent>
    </Dialog>
  )
}
