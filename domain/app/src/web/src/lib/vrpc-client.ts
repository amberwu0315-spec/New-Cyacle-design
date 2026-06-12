import {
  createVrpcClient,
  getClientInstanceId
} from '@yorun-ai/vrpc/client'
import { toast } from 'sonner'

import { redirectToLoginWithCurrentLocation } from './auth-session'
import { runtimeConfig } from './runtime-config'
import { getSessionCredential, getSessionScopeCredential } from './session-cookie'


export const vrpcClient = createVrpcClient({
  prefixUrl: runtimeConfig.vrpcInvokeUrl,
  clientInfo: {
    clientName: 'cyacle.web',
    clientVersion: runtimeConfig.vrpcClientVersion,
    clientInstanceId: getClientInstanceId(),
  },
})

vrpcClient.use({
  beforeRequest: (context) => {
    const sessionCredential = getSessionCredential()

    if (!sessionCredential) {
      return
    }

    const headers = new Headers(context.init.headers)
    headers.set('Authorization', `session ${sessionCredential}, scope ${getSessionScopeCredential()}`)
    context.init.headers = headers
  },
  onError: (error, context) => {
    console.error('VRPC Error:', error)

    if ((error as { status?: number })?.status === 401) {
      redirectToLoginWithCurrentLocation()
      return
    }

    if (context.suppressGlobalToast) {
      return
    }

    toast.error(error instanceof Error ? error.message : 'Request failed')
  },
})
