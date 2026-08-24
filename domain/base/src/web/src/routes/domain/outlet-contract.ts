import type { AnyRoute } from "@tanstack/react-router"

import { webDomainRootOutletIds } from "../config/outlets.ts"

export type WebDomainRootOutlet = (typeof webDomainRootOutletIds)[number]
export type WebDomainOutlet = "root" | WebDomainRootOutlet

export type WebDomainRootOutletRoute<TOutlet extends WebDomainRootOutlet> = AnyRoute & {
  readonly types: {
    readonly customId: TOutlet
  }
}

export type WebDomainRootOutletRoutes = Readonly<{
  [TOutlet in WebDomainRootOutlet]: WebDomainRootOutletRoute<TOutlet> | null
}>

export type WebDomainOutletRoutes<
  TRootRoute extends AnyRoute,
  TRootOutlets extends WebDomainRootOutletRoutes,
> = Readonly<
  { root: TRootRoute } & {
    [TOutlet in WebDomainRootOutlet]: TRootOutlets[TOutlet]
  }
>

export const webDomainOutletIds: readonly WebDomainOutlet[] = ["root", ...webDomainRootOutletIds]
