import * as React from 'react'
import type { ComponentPropsWithoutRef } from 'react'

import {
  agentCollaborationActions,
  useAgentCollaborationPanelPlacement,
  useCurrentAgentCollaborationPageConfig,
} from '#/components/assistant-workbench/page-agent-collaboration-store.ts'
import { useAssistantWorkbenchSelector } from '#/components/assistant-workbench/store/index.ts'

import { cn } from '#/lib/utils.ts'

export type ModuleLayoutProps = ComponentPropsWithoutRef<'div'>

export function ModuleLayout({
  children,
  className,
  ...props
}: ModuleLayoutProps) {
  const panelPlacement = useAgentCollaborationPanelPlacement()
  const currentAgentPageConfig = useCurrentAgentCollaborationPageConfig()
  const assistantOpen = useAssistantWorkbenchSelector(
    (snapshot) => snapshot.open && snapshot.renderMode === 'embedded',
  )
  const panelSlotElementRef = React.useRef<HTMLDivElement | null>(null)
  const panelSlotVisible = Boolean(
    currentAgentPageConfig?.enabled &&
      assistantOpen &&
      panelPlacement === 'inline',
  )
  const setPanelSlotElement = React.useCallback(
    (element: HTMLDivElement | null) => {
      panelSlotElementRef.current = element
      agentCollaborationActions.setLayoutPanelSlotElement(element)
    },
    [],
  )

  React.useEffect(
    () => () => {
      if (panelSlotElementRef.current) {
        agentCollaborationActions.setLayoutPanelSlotElement(null)
      }
    },
    [],
  )

  /*
   * ModuleLayout 是给 web module 页面使用的统一的轻量内容容器。
   * 它只提供常规页面 padding 和背景默认值。简单页面可以直接使用它；
   * 如果功能需要更高密度的控件、分栏、嵌入式流程或自定义 chrome，
   * module 也可以换成自己的页面布局。
   */
  return (
    <div
      {...props}
      data-slot='module-layout'
      className={cn(
        'flex min-h-full flex-col bg-background px-4 py-5 sm:px-6 lg:px-8',
        className,
      )}
    >
      <div
        data-slot='module-layout-frame'
        className='flex min-h-0 w-full flex-1 items-stretch gap-3'
      >
        <div
          data-slot='module-layout-content'
          className='flex min-h-0 min-w-0 flex-1 flex-col'
        >
          {children}
        </div>
        <div
          ref={setPanelSlotElement}
          data-slot='module-layout-agent-panel-slot'
          aria-hidden={!panelSlotVisible}
          className={cn(
            'min-h-0 shrink-0',
            panelSlotVisible
              ? 'flex min-h-[640px] max-h-[calc(100vh-132px)]'
              : 'hidden',
          )}
        />
      </div>
    </div>
  )
}
