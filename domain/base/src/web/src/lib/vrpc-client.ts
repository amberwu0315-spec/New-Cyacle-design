import {
  createFetchTransport,
  createVrpcClient,
  getClientInstanceId,
} from '@yorun-ai/vrpc/client'
import type {
  HttpTransport,
  HttpTransportResponse,
} from '@yorun-ai/vrpc/client'
import { toast } from 'sonner'

import { redirectToLoginWithCurrentLocation } from './auth-session'
import { runtimeConfig } from './runtime-config'
import {
  getSessionCredential,
  getSessionScopeCredential,
} from './session-cookie'

const VRPC_STATUS_HEADER = 'vrpc-status'
const VRPC_STATUS_ERROR = 'ERROR'
const AUTH_ERROR_CODES = new Set([
  'CLIENT_FORBIDDEN',
  'CLIENT_UNAUTHORIZED',
  'UNAUTHORIZED',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function parseResponseBody(bodyText: string | null) {
  if (!bodyText) {
    return null
  }

  try {
    return JSON.parse(bodyText) as unknown
  } catch {
    return null
  }
}

function hasEnvelopeError(payload: unknown) {
  return isRecord(payload) && payload.error != null
}

function normalizeEnvelopeErrorResponse(
  response: HttpTransportResponse,
): HttpTransportResponse {
  if (!hasEnvelopeError(parseResponseBody(response.bodyText))) {
    return response
  }

  const headers = new Headers(response.headers)
  headers.set(VRPC_STATUS_HEADER, VRPC_STATUS_ERROR)

  return {
    ...response,
    headers,
  }
}

const fetchTransport = createFetchTransport()
const strictVrpcTransport: HttpTransport = {
  request: async (request) => {
    const response = await fetchTransport.request(request)

    return normalizeEnvelopeErrorResponse(response)
  },
  close: fetchTransport.close?.bind(fetchTransport),
}

function getErrorStatus(error: unknown) {
  return isRecord(error) && typeof error.status === 'number'
    ? error.status
    : undefined
}

function getErrorCode(error: unknown) {
  return isRecord(error) && typeof error.code === 'string'
    ? error.code
    : undefined
}

function isAuthenticationError(error: unknown) {
  return (
    getErrorStatus(error) === 401 ||
    AUTH_ERROR_CODES.has(getErrorCode(error) ?? '')
  )
}

export const vrpcClient = createVrpcClient({
  prefixUrl: runtimeConfig.vrpcInvokeUrl,
  transport: strictVrpcTransport,
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

    const authorizationParts = [
      `session ${sessionCredential}`,
      `scope ${getSessionScopeCredential()}`,
    ]

    const headers = new Headers(context.init.headers)
    headers.set('Authorization', authorizationParts.join(', '))
    context.init.headers = headers
  },
  onError: (error, context) => {
    console.error('VRPC Error:', error)

    if (isAuthenticationError(error)) {
      redirectToLoginWithCurrentLocation()
      return
    }

    if (context.suppressGlobalToast) {
      return
    }

    toast.error(error instanceof Error ? error.message : 'Request failed')
  },
})
