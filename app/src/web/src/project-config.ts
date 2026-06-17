import {
  configureWebProjectConfig,
  type WebProjectConfig,
} from '@carbonnt-cyacle/web-base'

/**
 * 定义 Web 静态配置，可以给所有的 domain 共享
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
} satisfies WebProjectConfig

configureWebProjectConfig(webProjectConfig)
