import { describe, expect, it } from 'vitest'

import {
  COMMON_PERMISSION_CODES,
  COMMON_PERMISSION_CODE_LIST,
  definePermissionCodeDictionary,
  getPermissionCodeList,
  type PermissionCode,
} from './permission-codes.ts'

describe('permission code dictionary', () => {
  it('contains unique, documented permission codes', () => {
    expect(new Set(COMMON_PERMISSION_CODE_LIST).size).toBe(
      COMMON_PERMISSION_CODE_LIST.length,
    )

    for (const definition of Object.values(COMMON_PERMISSION_CODES)) {
      expect(definition.code.trim()).toBe(definition.code)
      expect(definition.code).not.toBe('')
      expect(definition.description.trim()).not.toBe('')
    }
  })

  it('does not include removed scene-level permissions', () => {
    expect(COMMON_PERMISSION_CODE_LIST).not.toEqual(
      expect.arrayContaining(['carbon_footprint', 'CFO']),
    )
  })

  it('allows an edition to define branded permission codes', () => {
    const editionPermissions = definePermissionCodeDictionary({
      overview: {
        code: 'custom_overview',
        description: '定制 edition 概览',
      },
    })
    const code: PermissionCode = editionPermissions.overview.code

    expect(getPermissionCodeList(editionPermissions)).toEqual([
      'custom_overview',
    ])
    expect(code).toBe('custom_overview')
  })
})
