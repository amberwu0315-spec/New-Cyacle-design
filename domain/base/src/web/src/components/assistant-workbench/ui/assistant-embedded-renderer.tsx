'use client'

import { cn } from '#/lib/utils.ts'
import { AssistantPanelContent } from './assistant-panel-content'
import type { AssistantPanelContentProps } from '../model/types'

export interface AssistantEmbeddedRendererProps
  extends Omit<AssistantPanelContentProps, 'className'> {
  open: boolean
  hidden?: boolean
  className?: string
  contentClassName?: string
}

export function AssistantEmbeddedRenderer({
  open,
  hidden = false,
  className,
  contentClassName,
  ...contentProps
}: AssistantEmbeddedRendererProps) {
  if (!open || hidden) {
    return null
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <AssistantPanelContent
        {...contentProps}
        className={cn('h-full', contentClassName)}
      />
    </div>
  )
}
