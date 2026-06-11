import {
  createVrpcClient,
  getClientInstanceId,
} from '@yorun-ai/vrpc/client'
import { toast } from 'sonner'

import { runtimeConfig } from './runtime-config'

export const vrpcClient = createVrpcClient({
  prefixUrl: runtimeConfig.vrpcInvokeUrl,
  clientInfo: {
    clientName: 'cyacle.web',
    clientVersion: runtimeConfig.vrpcClientVersion,
    clientInstanceId: getClientInstanceId(),
  },
})

vrpcClient.use({
  onError: (error, context) => {
    console.error('VRPC Error:', error)

    if (context.suppressGlobalToast) {
      return
    }

    toast.error(error instanceof Error ? error.message : 'Request failed')
  },
})
