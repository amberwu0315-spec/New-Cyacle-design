import type { AnyRouter } from '@tanstack/react-router'
import { mountApp, createAppRouter } from '@carbonnt-cyacle/web-base'

import "./styles.css";


const router = createAppRouter([
]) satisfies AnyRouter

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

mountApp(document.getElementById('app')!, router)
