import type { AnyRoute } from '@tanstack/react-router'
import { webDomainOutletIds, webDomainRootOutletIds } from '../web-domain.ts'

export { webDomainOutletIds, webDomainRootOutletIds }
export type WebDomainOutlet = (typeof webDomainOutletIds)[number]
export type WebDomainRootOutlet = (typeof webDomainRootOutletIds)[number]
export type WebDomainOutletRoutes<TRootRoute extends AnyRoute = AnyRoute> = Readonly<
  { root: TRootRoute } & Record<WebDomainRootOutlet, AnyRoute | null>
>
