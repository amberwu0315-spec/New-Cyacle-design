import { Outlet } from '@tanstack/react-router'

import { Toaster } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'

export function RootComponent() {
  return (
    <TooltipProvider>
      <Outlet />
      <Toaster position='top-center' />
    </TooltipProvider>
  )
}
