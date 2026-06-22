import type { PropsWithChildren } from 'react'

import { Toaster } from '#/components/ui/sonner.tsx'
import { TooltipProvider } from '#/components/ui/tooltip.tsx'
import { DocumentPreviewHost } from '#/components/common/document-preview/index.ts'
import { TanstackQueryRootProvider } from '#/lib/query-client.tsx'

export function BaseProviders({ children }: PropsWithChildren) {
  return (
    <TanstackQueryRootProvider>
      <TooltipProvider>
        {children}
        <DocumentPreviewHost />
        <Toaster position='top-center' />
      </TooltipProvider>
    </TanstackQueryRootProvider>
  )
}
