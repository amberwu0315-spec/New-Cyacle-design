import {
  createAppNavConfig,
  type AppNavConfig,
  type AppNavConfigOptions,
  type WebDomain,
} from '@carbonnt-cyacle/web-base'

import {
  DEFAULT_APP_EDITION,
  resolveAppEditionRegistration,
} from '#/app-edition.ts'

export function createConfiguredAppNavConfig(
  webDomains: ReadonlyArray<WebDomain>,
  options: AppNavConfigOptions = {},
  appEdition = DEFAULT_APP_EDITION,
): AppNavConfig {
  const registration = resolveAppEditionRegistration<
    AppNavConfigOptions,
    AppNavConfig
  >(webDomains, appEdition)

  return (
    registration?.createNavConfig(options) ??
    createAppNavConfig(webDomains, options)
  )
}

export function resolveAppEditionHomeTo(
  webDomains: ReadonlyArray<WebDomain>,
  appEdition = DEFAULT_APP_EDITION,
) {
  return (
    resolveAppEditionRegistration<AppNavConfigOptions, AppNavConfig>(
      webDomains,
      appEdition,
    )?.homeTo ?? '/cfp'
  )
}
