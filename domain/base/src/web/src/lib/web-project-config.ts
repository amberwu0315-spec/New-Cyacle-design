export interface WebProjectConfig {
  readonly capabilities: WebProjectCapabilitiesConfig
  readonly routes: WebProjectRoutesConfig
  readonly uploadServices: WebProjectUploadServicesConfig
}

export interface WebProjectCapabilitiesConfig {
  readonly agent: WebProjectCapabilityConfig
  readonly dataRecordMap: WebProjectCapabilityConfig
  readonly languageSwitcher: WebProjectCapabilityConfig
}

export interface WebProjectCapabilityConfig {
  readonly enabled: boolean
}

export interface WebProjectRoutesConfig {
  readonly loginPath: string
}

export interface WebProjectUploadServicesConfig {
  readonly file: WebProjectFileUploadServiceConfig
  readonly document: WebProjectDocumentUploadServiceConfig
}

export interface WebProjectFileUploadServiceConfig {
  readonly publicUploadPath: string
  readonly publicDownloadPath: string
  readonly privateUploadPath: string
  readonly privateDownloadPath: string
}

export interface WebProjectDocumentUploadServiceConfig {
  readonly uploadPath: string
  readonly downloadPath: string
}

let configuredWebProjectConfig: WebProjectConfig | undefined

export function configureWebProjectConfig(config: WebProjectConfig) {
  configuredWebProjectConfig = createWebProjectConfig(config)
}

export function getWebProjectConfig(): WebProjectConfig {
  if (!configuredWebProjectConfig) {
    throw new Error(
      'Web project config has not been configured. Import the app project-config module before creating the app router or using shared web libs.',
    )
  }

  return configuredWebProjectConfig
}

function createWebProjectConfig(config: WebProjectConfig): WebProjectConfig {
  return Object.freeze({
    capabilities: Object.freeze({
      agent: createCapabilityConfig(config.capabilities.agent, 'agent'),
      dataRecordMap: createCapabilityConfig(
        config.capabilities.dataRecordMap,
        'dataRecordMap',
      ),
      languageSwitcher: createCapabilityConfig(
        config.capabilities.languageSwitcher,
        'languageSwitcher',
      ),
    }),
    routes: Object.freeze({
      loginPath: normalizeRequiredPath(
        config.routes.loginPath,
        'routes.loginPath',
      ),
    }),
    uploadServices: Object.freeze({
      file: Object.freeze({
        publicUploadPath: normalizeRequiredPath(
          config.uploadServices.file.publicUploadPath,
          'uploadServices.file.publicUploadPath',
        ),
        publicDownloadPath: normalizeRequiredPath(
          config.uploadServices.file.publicDownloadPath,
          'uploadServices.file.publicDownloadPath',
        ),
        privateUploadPath: normalizeRequiredPath(
          config.uploadServices.file.privateUploadPath,
          'uploadServices.file.privateUploadPath',
        ),
        privateDownloadPath: normalizeRequiredPath(
          config.uploadServices.file.privateDownloadPath,
          'uploadServices.file.privateDownloadPath',
        ),
      }),
      document: Object.freeze({
        uploadPath: normalizeRequiredPath(
          config.uploadServices.document.uploadPath,
          'uploadServices.document.uploadPath',
        ),
        downloadPath: normalizeRequiredPath(
          config.uploadServices.document.downloadPath,
          'uploadServices.document.downloadPath',
        ),
      }),
    }),
  })
}

function createCapabilityConfig(
  config: WebProjectCapabilityConfig,
  configKey: keyof WebProjectCapabilitiesConfig,
) {
  if (typeof config.enabled !== 'boolean') {
    throw new Error(
      `Web project config capabilities.${configKey}.enabled must be a boolean.`,
    )
  }

  return Object.freeze({ enabled: config.enabled })
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
