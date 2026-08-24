import type { WebRouterOptions } from "../router/options.ts"

export const defaultWebRouterOptions = {
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
} satisfies WebRouterOptions
