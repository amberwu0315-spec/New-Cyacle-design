import { describe, expect, it } from 'vitest'
import type { LucideIcon } from 'lucide-react'

import type { WebDomain } from '../../../routes/domain/builder.ts'
import {
  definePermissionCodeDictionary,
} from '#/permissions/permission-codes.ts'
import {
  createAppNavConfig,
  createAppPermissionCodes,
} from './nav-config.tsx'

const TestIcon = (() => null) as unknown as LucideIcon

const TEST_PERMISSION_CODES = definePermissionCodeDictionary({
  actionEdit: { code: 'action_edit', description: 'test' },
  sceneView: { code: 'scene_view', description: 'test' },
  groupView: { code: 'group_view', description: 'test' },
  hiddenView: { code: 'hidden_view', description: 'test' },
  visibleView: { code: 'visible_view', description: 'test' },
})

function createDomain(): WebDomain {
  return {
    id: 'test',
    routes: [],
    capabilities: {
      permissionCodes: [TEST_PERMISSION_CODES.actionEdit.code],
      nav: () => ({
        id: 'test-scene',
        label: 'Test',
        desc: 'Test scene',
        icon: TestIcon,
        defaultTo: '/hidden',
        visible: TEST_PERMISSION_CODES.sceneView.code,
        groups: [
          {
            id: 'empty-group',
            title: 'Empty',
            visible: TEST_PERMISSION_CODES.groupView.code,
            items: [
              {
                id: 'hidden',
                label: 'Hidden',
                desc: 'Hidden item',
                to: '/hidden',
                icon: TestIcon,
                visible: TEST_PERMISSION_CODES.hiddenView.code,
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
                visible: TEST_PERMISSION_CODES.visibleView.code,
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
