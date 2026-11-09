import { describe, expect, it } from 'vitest'

import {
  APP_EDITION_ATTRIBUTE,
  applyAppEditionToDocument,
  resolveAppEditionRegistration,
} from './app-edition.ts'

describe('applyAppEditionToDocument', () => {
  it('exposes the selected edition to edition-scoped styles', () => {
    const attributes = new Map<string, string>()
    const root = {
      setAttribute: (name: string, value: string) => {
        attributes.set(name, value)
      },
    }

    applyAppEditionToDocument('custom', root)

    expect(attributes.get(APP_EDITION_ATTRIBUTE)).toBe('custom')
  })
})

function createEditionDomain(id: string) {
  return {
    id,
    capabilities: {
      appEdition: {
        id,
        homeTo: `/${id}`,
        createNavConfig: () => ({ id }),
      },
    },
  }
}

describe('app edition registry', () => {
  it('keeps the default edition outside custom registrations', () => {
    expect(resolveAppEditionRegistration([], 'default')).toBeNull()
  })

  it('resolves a registered edition', () => {
    const registration = resolveAppEditionRegistration(
      [createEditionDomain('custom')],
      'custom',
    )

    expect(registration?.homeTo).toBe('/custom')
    expect(registration?.createNavConfig({})).toEqual({ id: 'custom' })
  })

  it('rejects an unknown edition', () => {
    expect(() => resolveAppEditionRegistration([], 'missing')).toThrow(
      'Unknown app edition "missing"',
    )
  })
})
