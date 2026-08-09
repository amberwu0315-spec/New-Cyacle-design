import { describe, expect, it } from 'vitest'

import { appPermissionCodes } from './app-permissions.ts'

const CURRENT_MENU_PERMISSION_CODES = [
  'CFO',
  'SSO_oauth',
  'account',
  'accounting',
  'audit_log',
  'base_flow_factor',
  'carbon_footprint',
  'cfo_accounting',
  'composite_factor',
  'database',
  'document_factor',
  'element_mgt',
  'employee_mgt',
  'enterprise_served',
  'order',
  'org_profile_mgt',
  'org_structure_mgt',
  'reference_mgt',
  'role',
  'service_provider',
  'ticket',
] as const

describe('app permission aggregation', () => {
  it('includes every permission code used by the current navigation', () => {
    expect(appPermissionCodes).toEqual(
      expect.arrayContaining(CURRENT_MENU_PERMISSION_CODES),
    )
  })

  it('deduplicates permission codes contributed by multiple domains', () => {
    expect(new Set(appPermissionCodes).size).toBe(appPermissionCodes.length)
  })
})
