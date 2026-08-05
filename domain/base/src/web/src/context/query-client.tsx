import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

let queryClientSingleton: QueryClient | undefined

export function getQueryClient() {
  queryClientSingleton ??= new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return queryClientSingleton
}

export const queryClient = getQueryClient()

type TanstackQueryRootProviderProps = PropsWithChildren

export function TanstackQueryRootProvider({
  children,
}: TanstackQueryRootProviderProps) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  )
}
