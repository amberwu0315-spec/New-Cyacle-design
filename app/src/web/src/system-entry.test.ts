import { describe, expect, it } from 'vitest'

import {
  resolveSystemEntryAccess,
  resolveSystemEntryHomeTo,
} from './system-entry.ts'

describe('resolveSystemEntryAccess', () => {
  it('opens admin by default for a MATRIX-only organization', () => {
    expect(resolveSystemEntryAccess(['MATRIX'])).toEqual({
      canOpenAdmin: true,
      defaultEntry: 'admin',
      showAdminLink: false,
    })
  })

  it('keeps mixed organizations in the frontend and exposes admin', () => {
    expect(resolveSystemEntryAccess(['MATRIX', 'PCF'])).toEqual({
      canOpenAdmin: true,
      defaultEntry: 'frontend',
      showAdminLink: true,
    })
  })

  it('treats UNSPECIFIED as another code for safe fallback', () => {
    expect(resolveSystemEntryAccess(['MATRIX', 'UNSPECIFIED'])).toEqual({
      canOpenAdmin: true,
      defaultEntry: 'frontend',
      showAdminLink: true,
    })
  })

  it.each([undefined, null, [], ['PCF'] as const])(
    'keeps organizations without MATRIX in the frontend',
    (businessCodes) => {
      expect(resolveSystemEntryAccess(businessCodes)).toEqual({
        canOpenAdmin: false,
        defaultEntry: 'frontend',
        showAdminLink: false,
      })
    },
  )
})

describe('resolveSystemEntryHomeTo', () => {
  it('maps the classified entry to its configured home route', () => {
    expect(
      resolveSystemEntryHomeTo({
        adminHomeTo: '/admin/factors',
        businessCodes: ['MATRIX'],
        frontendHomeTo: '/products',
      }),
    ).toBe('/admin/factors')

    expect(
      resolveSystemEntryHomeTo({
        adminHomeTo: '/admin/factors',
        businessCodes: ['MATRIX', 'PCF'],
        frontendHomeTo: '/products',
      }),
    ).toBe('/products')
  })
})
