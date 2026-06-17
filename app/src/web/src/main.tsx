import { RouterProvider } from '@tanstack/react-router'
import ReactDOM from 'react-dom/client'
import { BaseProviders } from '@carbonnt-cyacle/web-base'

import '#/vineStyles.gen.css'
import { router } from '#/router.ts'

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <BaseProviders>
      <RouterProvider router={router} />
    </BaseProviders>,
  )
}
