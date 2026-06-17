export interface WebProjectConfig {
  readonly routes: WebProjectRoutesConfig
}

export interface WebProjectRoutesConfig {
  readonly loginPath: string
}

let configuredWebProjectConfig: WebProjectConfig | undefined

export function configureWebProjectConfig(config: WebProjectConfig) {
  configuredWebProjectConfig = createWebProjectConfig(config)
}

export function getWebProjectConfig(): WebProjectConfig {
  if (!configuredWebProjectConfig) {
    throw new Error(
      'Web project config has not been configured. Call configureWebProjectConfig(...) in the app entry before using shared web libs.',
    )
  }

  return configuredWebProjectConfig
}

function createWebProjectConfig(config: WebProjectConfig): WebProjectConfig {
  return Object.freeze({
    routes: Object.freeze({
      loginPath: normalizeRequiredPath(
        config.routes.loginPath,
        'routes.loginPath',
      ),
    }),
  })
}

function normalizeRequiredPath(path: string, configKey: string) {
  const normalizedPath = path.trim()

  if (!normalizedPath) {
    throw new Error(`Web project config ${configKey} must be configured.`)
  }

  if (!normalizedPath.startsWith('/')) {
    throw new Error(`Web project config ${configKey} must start with "/".`)
  }

  return normalizedPath
}
