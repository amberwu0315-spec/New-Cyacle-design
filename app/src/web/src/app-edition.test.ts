import { describe, expect, it } from 'vitest'
import type { ComponentType } from 'react'

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

function createEditionDomain(id: string, layout?: ComponentType) {
  return {
    capabilities: {
      appEdition: {
        id,
        homeTo: `/${id}`,
        createNavConfig: () => ({ id }),
        layout,
      },
    },
  }
}

describe('app edition registry', () => {
  it('keeps the default edition outside custom registrations', () => {
    expect(resolveAppEditionRegistration([], 'default')).toBeNull()
  })

  it('resolves a registered edition', () => {
    const CustomLayout = () => null
    const registration = resolveAppEditionRegistration(
      [createEditionDomain('custom', CustomLayout)],
      'custom',
    )

    expect(registration?.homeTo).toBe('/custom')
    expect(registration?.createNavConfig({})).toEqual({ id: 'custom' })
    expect(registration?.layout).toBe(CustomLayout)
  })

  it('rejects an unknown edition', () => {
    expect(() => resolveAppEditionRegistration([], 'missing')).toThrow(
      'Unknown app edition "missing"',
    )
  })
})
