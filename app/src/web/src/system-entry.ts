import type { BusinessCode } from '@carbonnt-cyacle/skeled-uicpub'

export type SystemEntry = 'admin' | 'frontend'

export type SystemEntryAccess = {
  canOpenAdmin: boolean
  defaultEntry: SystemEntry
  showAdminLink: boolean
  showFrontendLink: boolean
}

export interface ResolveSystemEntryHomeToOptions {
  adminHomeTo: string
  businessCodes?: ReadonlyArray<BusinessCode> | null
  frontendHomeTo: string
}

export function resolveSystemEntryAccess(
  businessCodes?: ReadonlyArray<BusinessCode> | null,
): SystemEntryAccess {
  const codes = new Set(businessCodes ?? [])
  const canOpenAdmin = codes.has('MATRIX')
  const hasOtherBusiness = [...codes].some((code) => code !== 'MATRIX')
  const isMatrixOnly = canOpenAdmin && !hasOtherBusiness

  return {
    canOpenAdmin,
    defaultEntry: isMatrixOnly ? 'admin' : 'frontend',
    showAdminLink: canOpenAdmin && hasOtherBusiness,
    showFrontendLink: canOpenAdmin && hasOtherBusiness,
  }
}

export function resolveSystemEntryHomeTo({
  adminHomeTo,
  businessCodes,
  frontendHomeTo,
}: ResolveSystemEntryHomeToOptions): string {
  return resolveSystemEntryAccess(businessCodes).defaultEntry === 'admin'
    ? adminHomeTo
    : frontendHomeTo
}
