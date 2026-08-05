import {
  configureAssistantAgentRuntime,
  configureWebProjectConfig,
  getSessionCredential,
  getSessionScopeCredential,
  type WebProjectConfig,
} from '@carbonnt-cyacle/web-base'
import {
  getDocumentDownloadUrl,
  uploadDocumentFile,
} from '@carbonnt-cyacle/web-uic/pub'

import { createAssistantAgentRuntimeConfig } from '#/adapters/assistant-agent-adapter.ts'

function buildAuthorizationHeader() {
  const sessionCredential = getSessionCredential()

  if (!sessionCredential) {
    return null
  }

  return `session ${sessionCredential}, scope ${getSessionScopeCredential()}`
}

function buildEventStreamHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers)
  const authorization = buildAuthorizationHeader()

  nextHeaders.set('accept', 'text/event-stream')

  if (authorization) {
    nextHeaders.set('Authorization', authorization)
  }

  return nextHeaders
}

/**
 * 定义 Web 静态配置，可以给所有的 domain 共享。
 * app router 启动时会断言配置已经完成；缺少配置会在编译期或运行时明确失败。
 *
 * @example
 * ```ts
 * import { getWebProjectConfig } from '@carbonnt-cyacle/web-base'
 *
 * const config = getWebProjectConfig()
 * ```
 */
const webProjectConfig = {
  routes: {
    loginPath: '/uic/login',
  },
  uploadServices: {
    file: {
      publicUploadPath: '/file.FileWeb/FileService/public/upload',
      publicDownloadPath: '/file.FileWeb/FileService/public/download',
      privateUploadPath: '/file.FileWeb/FileService/upload',
      privateDownloadPath: '/file.FileWeb/FileService/download',
    },
    document: {
      uploadPath: '/uic.DocumentWeb/DocumentService/upload',
      downloadPath: '/uic.DocumentWeb/DocumentService/download',
    },
  },
} satisfies WebProjectConfig

configureWebProjectConfig(webProjectConfig)

configureAssistantAgentRuntime({
  ...createAssistantAgentRuntimeConfig(),
  getAgentEventHeaders: buildEventStreamHeaders,
  getDocumentDownloadUrl,
  getDocumentInfoByIds: () => [],
  uploadAttachment: (attachment, { organizationId }) =>
    uploadDocumentFile({
      file: attachment.file,
      organizationId,
    }),
})
