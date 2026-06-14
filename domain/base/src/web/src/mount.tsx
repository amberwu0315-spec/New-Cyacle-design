import type { AnyRouter } from '@tanstack/react-router'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'

import { TanstackQueryRootProvider } from './lib/query-client'

export function mountApp(rootElement: HTMLElement, router: AnyRouter) {
  if (rootElement.innerHTML) return

  ReactDOM.createRoot(rootElement).render(
    <TanstackQueryRootProvider>
      <RouterProvider router={router} />
    </TanstackQueryRootProvider>
  )
}
