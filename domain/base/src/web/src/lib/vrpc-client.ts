import {
  createFetchTransport,
  createVrpcClient,
  getClientInstanceId,
} from '@yorun-ai/vrpc/client'
import { createHttpClient } from '@yorun-ai/vrpc/http'
import type {
  HttpTransport,
  HttpTransportResponse,
} from '@yorun-ai/vrpc/client'
import { toast } from 'sonner'

import { redirectToLoginWithCurrentLocation } from '#/lib/auth-session.ts'
import { runtimeConfig } from '#/lib/runtime-config.ts'
import {
  getSessionCredential,
  getSessionScopeCredential,
} from '#/lib/session-cookie.ts'

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

function attachSessionAuthorization(context: { init: RequestInit }) {
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
}

function handleClientError(
  error: unknown,
  context: { suppressGlobalToast?: boolean, path: string },
) {
  console.error('VRPC Error:', error)

  if (isAuthenticationError(error)) {
    // 只针对用户信息接口报错跳登录页面，其他接口如果报 401 可能是权限问题或者配置问题，不直接跳登录
    if (context.path.includes('getProfile')) {
      redirectToLoginWithCurrentLocation()
    }
    return
  }

  if (context.suppressGlobalToast) {
    return
  }

  toast.error(error instanceof Error ? error.message : 'Request failed')
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

export const vrpcHttpClient = createHttpClient({
  prefixUrl: '/',
  fetchOptions: {
    credentials: 'include',
  },
})

vrpcClient.use({
  beforeRequest: attachSessionAuthorization,
  onError: handleClientError,
})

vrpcHttpClient.use({
  beforeRequest: attachSessionAuthorization,
  onError: handleClientError,
})
