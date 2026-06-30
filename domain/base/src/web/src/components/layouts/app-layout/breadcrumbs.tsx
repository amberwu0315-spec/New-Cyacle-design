import * as React from 'react'

import type { AppShellBreadcrumbItem } from '#/components/common/app-shell-frame/index.ts'

export type AppLayoutBreadcrumbItems = Array<AppShellBreadcrumbItem>

export interface AppLayoutBreadcrumbsContextValue {
  setBreadcrumbItems: React.Dispatch<
    React.SetStateAction<AppLayoutBreadcrumbItems | null>
  >
}

const AppLayoutBreadcrumbsContext =
  React.createContext<AppLayoutBreadcrumbsContextValue | null>(null)

export function AppLayoutBreadcrumbsProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: AppLayoutBreadcrumbsContextValue
}) {
  return (
    <AppLayoutBreadcrumbsContext.Provider value={value}>
      {children}
    </AppLayoutBreadcrumbsContext.Provider>
  )
}

export function useAppLayoutBreadcrumbs(
  items: AppLayoutBreadcrumbItems | null,
) {
  const context = React.useContext(AppLayoutBreadcrumbsContext)

  React.useEffect(() => {
    if (!context) {
      return undefined
    }

    context.setBreadcrumbItems(items)

    return () => {
      context.setBreadcrumbItems((currentItems) =>
        currentItems === items ? null : currentItems,
      )
    }
  }, [context, items])
}
