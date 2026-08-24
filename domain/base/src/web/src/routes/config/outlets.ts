/** Pathless root layout outlets available to every web domain. */
export const webDomainRootOutletIds = defineWebDomainRootOutletIds("app", "admin")

function defineWebDomainRootOutletIds<const TOutlets extends readonly string[]>(
  ...outlets: TOutlets
) {
  return outlets
}
