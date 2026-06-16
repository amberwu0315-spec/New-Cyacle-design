import type { AnyRouter } from '@tanstack/react-router'
import { mountApp, createAppRouter } from '@carbonnt-cyacle/web-base'

import "./styles.css";

import { createDomainRouteTree as createProjectDataRouteTree } from '@carbonnt-cyacle/web-project-data'
import { createDomainRouteTree as createUicRouteTree } from '@carbonnt-cyacle/web-uic'

const router = createAppRouter([
    createProjectDataRouteTree,
    createUicRouteTree
]) satisfies AnyRouter

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

mountApp(document.getElementById('app')!, router)
