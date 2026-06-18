import {
  configureWebProjectConfig,
  type WebProjectConfig,
} from '@carbonnt-cyacle/web-base'

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
