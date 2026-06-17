export type WebDomainCapabilities = Record<string, unknown>

export type WebDomainRouteMountKey = 'root' | 'shell' | (string & {})

export type WebDomainRouteOutlets<
  TMountKey extends string = WebDomainRouteMountKey,
> = Readonly<Record<string, TMountKey>>

export type WebRouteHandle = any

export interface WebDomainRouteFactoryContext<
  TMountKey extends string = WebDomainRouteMountKey,
> {
  capabilities: WebDomainCapabilities
  domainId: string
  outlet: TMountKey
  parentRoute: WebRouteHandle
}

export type WebDomainRouteFactory<
  TMountKey extends string = WebDomainRouteMountKey,
> = (
  context: WebDomainRouteFactoryContext<TMountKey>,
) => WebRouteHandle | Array<WebRouteHandle>

export type WebDomainRouteMounts<
  TMountKey extends string = WebDomainRouteMountKey,
> = Partial<Record<TMountKey, Array<WebDomainRouteFactory<TMountKey>>>>

export interface WebDomain<
  TCapabilities extends object = WebDomainCapabilities,
  TMountKey extends string = WebDomainRouteMountKey,
> {
  capabilities?: TCapabilities
  id: string
  routeMounts: WebDomainRouteMounts<TMountKey>
}

export function defineWebDomain<
  TCapabilities extends object = WebDomainCapabilities,
  TMountKey extends string = WebDomainRouteMountKey,
>(): <const TDomain extends WebDomain<TCapabilities, TMountKey>>(
  domain: TDomain,
) => TDomain

export function defineWebDomain<const TDomain extends WebDomain>(
  domain: TDomain,
): TDomain

export function defineWebDomain(domain?: WebDomain) {
  if (domain) {
    return domain
  }

  return <const TDomain extends WebDomain>(domain: TDomain) => domain
}

export function defineWebDomainRouteOutlets<
  const TOutlets extends WebDomainRouteOutlets,
>(
  outlets: TOutlets,
): TOutlets {
  return outlets
}

export interface ResolveWebDomainRouteMountOptions<
  TMountKey extends string = WebDomainRouteMountKey,
> {
  domains: ReadonlyArray<WebDomain>
  outlet: TMountKey
  parentRoute: WebRouteHandle
}

export function resolveWebDomainRouteMount<
  const TMountKey extends string = WebDomainRouteMountKey,
>({
  domains,
  outlet,
  parentRoute,
}: ResolveWebDomainRouteMountOptions<TMountKey>): Array<WebRouteHandle> {
  return domains.flatMap((domain) => {
    const factories = domain.routeMounts[outlet] ?? []

    return factories.flatMap((factory) => {
      const result = factory({
        capabilities: domain.capabilities ?? {},
        domainId: domain.id,
        outlet,
        parentRoute,
      })

      return Array.isArray(result) ? result : [result]
    })
  })
}

export function collectWebDomainCapabilities<TCapability>(
  domains: ReadonlyArray<WebDomain>,
  capabilityKey: string,
): Array<TCapability> {
  return domains.flatMap((domain) => {
    const capability = domain.capabilities?.[capabilityKey]

    return typeof capability === 'undefined'
      ? []
      : [capability as TCapability]
  })
}
