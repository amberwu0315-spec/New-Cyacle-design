import type { PropsWithChildren } from 'react'

import { Toaster } from '#/components/ui/sonner.tsx'
import { TooltipProvider } from '#/components/ui/tooltip.tsx'
import { TanstackQueryRootProvider } from '#/lib/query-client.tsx'

export function BaseProviders({ children }: PropsWithChildren) {
  return (
    <TanstackQueryRootProvider>
      <TooltipProvider>
        {children}
        <Toaster position='top-center' />
      </TooltipProvider>
    </TanstackQueryRootProvider>
  )
}
