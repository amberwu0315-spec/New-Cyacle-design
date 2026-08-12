import { describe, expect, it } from 'vitest'
import type { LucideIcon } from 'lucide-react'

import type { WebDomain } from '../../../routes/web-domain.ts'
import {
  createAppNavConfig,
  createAppPermissionCodes,
} from './nav-config.tsx'

const TestIcon = (() => null) as unknown as LucideIcon

function createDomain(): WebDomain {
  return {
    id: 'test',
    routeMounts: {},
    capabilities: {
      permissionCodes: ['action_edit'],
      nav: () => ({
        id: 'test-scene',
        label: 'Test',
        desc: 'Test scene',
        icon: TestIcon,
        defaultTo: '/hidden',
        permissionCode: 'scene_view',
        groups: [
          {
            id: 'empty-group',
            title: 'Empty',
            permissionCode: 'group_view',
            items: [
              {
                id: 'hidden',
                label: 'Hidden',
                desc: 'Hidden item',
                to: '/hidden',
                icon: TestIcon,
                permissionCode: 'hidden_view',
              },
            ],
          },
          {
            id: 'visible-group',
            title: 'Visible',
            items: [
              {
                id: 'visible',
                label: 'Visible',
                desc: 'Visible item',
                to: '/visible',
                icon: TestIcon,
                category: 'featured',
                permissionCode: 'visible_view',
              },
            ],
          },
        ],
      }),
    },
  }
}

describe('app navigation permissions', () => {
  it('hides denied items and empty groups, then falls back to the first visible item', () => {
    const config = createAppNavConfig([createDomain()], {
      permissionCodeMap: {
        scene_view: true,
        group_view: true,
        hidden_view: false,
        visible_view: true,
      },
    })

    expect(config.scenes).toHaveLength(1)
    expect(config.scenes[0]?.groups.map((group) => group.id)).toEqual([
      'visible-group',
    ])
    expect(config.scenes[0]?.defaultTo).toBe('/visible')
    expect(config.scenes[0]?.groups[0]?.items[0]?.category).toBe('featured')
  })

  it('hides a denied scene', () => {
    const config = createAppNavConfig([createDomain()], {
      permissionCodeMap: { scene_view: false, visible_view: true },
    })

    expect(config.scenes).toEqual([])
    expect(config.defaultSceneId).toBe('')
  })

  it('collects explicit, scene, group, and item permission codes once', () => {
    expect(createAppPermissionCodes([createDomain()])).toEqual([
      'action_edit',
      'scene_view',
      'group_view',
      'hidden_view',
      'visible_view',
    ])
  })
})
