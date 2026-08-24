export const DEFAULT_APP_EDITION = 'default'
export const APP_EDITION_ATTRIBUTE = 'data-app-edition'

export interface AppEditionRegistration<TOptions, TNavConfig> {
  id: string
  homeTo: string
  createNavConfig: (options: TOptions) => TNavConfig
}

interface AppEditionCapability<TOptions, TNavConfig> {
  appEdition?: AppEditionRegistration<TOptions, TNavConfig>
}

export function getAppEdition() {
  return import.meta.env.VITE_APP_EDITION?.trim() || DEFAULT_APP_EDITION
}

export function applyAppEditionToDocument(
  appEdition: string,
  root: Pick<HTMLElement, 'setAttribute'> = document.documentElement,
) {
  root.setAttribute(APP_EDITION_ATTRIBUTE, appEdition)
}

export function resolveAppEditionRegistration<TOptions, TNavConfig>(
  webDomains: ReadonlyArray<{ capabilities?: object; id: string }>,
  appEdition: string,
) {
  if (appEdition === DEFAULT_APP_EDITION) {
    return null
  }

  const registrations = webDomains.flatMap((webDomain) => {
    const registration = (
      webDomain.capabilities as
        | AppEditionCapability<TOptions, TNavConfig>
        | undefined
    )?.appEdition

    return registration?.id === appEdition ? [registration] : []
  })

  if (registrations.length > 1) {
    throw new Error(`App edition "${appEdition}" is registered more than once.`)
  }

  const registration = registrations[0]

  if (!registration) {
    const availableEditions = webDomains.flatMap((webDomain) => {
      const candidate = (
        webDomain.capabilities as
          | AppEditionCapability<TOptions, TNavConfig>
          | undefined
      )?.appEdition

      return candidate ? [candidate.id] : []
    })

    throw new Error(
      `Unknown app edition "${appEdition}". Available editions: ${[
        DEFAULT_APP_EDITION,
        ...availableEditions,
      ].join(', ')}.`,
    )
  }

  return registration
}
