import {
  configureWebProjectConfig,
  type WebProjectConfig,
} from '@carbonnt-cyacle/web-base'

const webProjectConfig = {
  routes: {
    loginPath: '/uic/login',
  },
} satisfies WebProjectConfig

configureWebProjectConfig(webProjectConfig)
