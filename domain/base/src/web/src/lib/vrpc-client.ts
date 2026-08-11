import {
  createFetchTransport,
  createVrpcClient,
  getClientInstanceId,
  isVrpcError,
} from '@yorun-ai/vrpc/client'
import { createHttpClient } from '@yorun-ai/vrpc/http'
import type {
  HttpInvokeContext,
  HttpTransport,
  HttpTransportResponse,
  VrpcInvokeContext,
} from '@yorun-ai/vrpc/client'

import { redirectToLoginWithCurrentLocation } from '#/lib/auth-session.ts'
import { runtimeConfig } from '#/lib/runtime-config.ts'
import {
  getSessionAuthorizationHeader,
} from '#/lib/session-storage.ts'
import { toast } from '#/components/ui/toast.tsx'

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

function parseResponseBody(body: Uint8Array | null) {
  if (!body?.length) {
    return null
  }

  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown
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
  if (!hasEnvelopeError(parseResponseBody(response.body))) {
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
  const authorization = getSessionAuthorizationHeader()

  if (!authorization) {
    return
  }

  const headers = new Headers(context.init.headers)
  headers.set('Authorization', authorization)
  context.init.headers = headers
}

function handleClientError(
  error: unknown,
  context: VrpcInvokeContext | HttpInvokeContext,
) {
  if (isVrpcError(error) && error.kind === "abort") {
    return
  }

  console.error('VRPC Error:', error)

  if (isAuthenticationError(error)) {
    // 只针对用户信息接口报错跳登录页面，其他接口如果报 401 可能是权限问题或者配置问题，不直接跳登录
    if (getRequestPath(context).includes('getProfile')) {
      redirectToLoginWithCurrentLocation()
    }
    return
  }

  if (context.options.suppressGlobalToast) {
    return
  }

   toast.add({
    type: "error",
    description: error instanceof Error ? error.message : "Request failed",
  })
}

function getRequestPath(context: VrpcInvokeContext | HttpInvokeContext) {
  if ('path' in context.request) {
    return context.request.path
  }

  return `${context.request.serviceName}/${context.request.methodName}`
}

let vrpcClientSingleton: ReturnType<typeof createVrpcClient> | undefined
let vrpcHttpClientSingleton: ReturnType<typeof createHttpClient> | undefined

export function getVrpcClient() {
  if (vrpcClientSingleton) {
    return vrpcClientSingleton
  }

  const client = createVrpcClient({
    prefixUrl: runtimeConfig.vrpcInvokeUrl,
    transport: strictVrpcTransport,
    clientInfo: {
      clientName: 'cyacle.web',
      clientVersion: runtimeConfig.vrpcClientVersion,
      clientInstanceId: getClientInstanceId(),
    },
  })

  client.use({
    beforeRequest: attachSessionAuthorization,
    onError: handleClientError,
  })

  vrpcClientSingleton = client
  return vrpcClientSingleton
}

export function getVrpcHttpClient() {
  if (vrpcHttpClientSingleton) {
    return vrpcHttpClientSingleton
  }

  const client = createHttpClient({
    prefixUrl: '/',
    requestInit: {
      credentials: 'include',
    },
  })

  client.use({
    beforeRequest: attachSessionAuthorization,
    onError: handleClientError,
  })

  vrpcHttpClientSingleton = client
  return vrpcHttpClientSingleton
}

export const vrpcClient = getVrpcClient()
export const vrpcHttpClient = getVrpcHttpClient()
