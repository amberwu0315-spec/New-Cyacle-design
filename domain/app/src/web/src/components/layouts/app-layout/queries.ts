import { useQuery } from '@tanstack/react-query'
import { createPcfUserApiService } from '@carbonnt-cyacle/skeled-uicpub'

import { vrpcClient } from '../../../lib/vrpc-client'

const pcfUserApiService = createPcfUserApiService(vrpcClient)

export const accountProfileKeys = {
  profile: () => ['uic.PCFUserApiService', 'getProfile'] as const,
}

export function useCurrentUserProfile() {
  return useQuery({
    queryKey: accountProfileKeys.profile(),
    queryFn: () =>
      pcfUserApiService.getProfile(null, { suppressGlobalToast: true }),
  })
}
