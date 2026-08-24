import type {
  AnyRoute,
  RouterConstructorOptions,
  RouterHistory,
  TrailingSlashOption,
} from '@tanstack/react-router'

export type WebRouterOptions = Omit<
  RouterConstructorOptions<
    AnyRoute,
    TrailingSlashOption,
    boolean,
    RouterHistory,
    Record<string, unknown>
  >,
  'routeTree'
>
