import { useQuery } from '@tanstack/react-query'
import { createPcfUserApiService } from '@carbonnt-cyacle/skeled-uicpub'

import { vrpcClient } from '../../../lib/vrpc-client'
import {
  fetchAvailableWorkspaces,
  workspaceKeys,
} from '../../../lib/workspace-session'

const pcfUserApiService = createPcfUserApiService(vrpcClient)
const getProfileMeta = {
  serviceName: 'uic.PCFUserApiService',
  methodName: 'getProfile',
} as const

export const accountProfileKeys = {
  profile: () => [getProfileMeta.serviceName, getProfileMeta.methodName] as const,
}

export function useCurrentUserProfile() {
  return useQuery({
    queryKey: accountProfileKeys.profile(),
    queryFn: () =>
      pcfUserApiService.getProfile(null, { suppressGlobalToast: true }),
  })
}

export function useAvailableWorkspaces({ enabled = true } = {}) {
  return useQuery({
    enabled,
    queryKey: workspaceKeys.list(),
    queryFn: fetchAvailableWorkspaces,
  })
}
