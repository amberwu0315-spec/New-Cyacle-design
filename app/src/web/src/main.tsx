import type { AnyRouter } from '@tanstack/react-router'
import { mountApp, createAppRouter } from '@carbonnt-cyacle/web-app'

import "./styles.css";

import { createDomainRouteTree as createUicRouteTree } from '@carbonnt-cyacle/web-uic'

const router = createAppRouter([
    createUicRouteTree
]) satisfies AnyRouter

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

mountApp(document.getElementById('app')!, router)
