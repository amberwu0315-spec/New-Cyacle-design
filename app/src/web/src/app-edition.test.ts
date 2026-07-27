import { describe, expect, it } from 'vitest'

import { resolveAppEditionRegistration } from './app-edition.ts'

function createEditionDomain(id: string) {
  return {
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
      [createEditionDomain('wuxibiologics')],
      'wuxibiologics',
    )

    expect(registration?.homeTo).toBe('/wuxibiologics')
    expect(registration?.createNavConfig({})).toEqual({ id: 'wuxibiologics' })
  })

  it('rejects an unknown edition', () => {
    expect(() => resolveAppEditionRegistration([], 'missing')).toThrow(
      'Unknown app edition "missing"',
    )
  })
})
