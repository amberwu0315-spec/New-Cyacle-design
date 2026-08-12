import { describe, expect, it } from 'vitest'
import type { LucideIcon } from 'lucide-react'

import type { WebDomain } from '@carbonnt-cyacle/web-base'

import { createConfiguredAppNavConfig } from './app-nav-config.ts'

const TestIcon = (() => null) as unknown as LucideIcon

function createDomain({
  id,
  itemId,
  category,
}: {
  id: string
  itemId: string
  category?: string
}): WebDomain {
  return {
    id,
    routeMounts: {},
    capabilities: {
      nav: () => ({
        id: `domain-${id}`,
        label: id,
        desc: `${id} scene`,
        icon: TestIcon,
        defaultTo: `/${id}`,
        groups: [
          {
            id: `${id}-group`,
            title: null,
            items: [
              {
                id: itemId,
                label: itemId,
                desc: `${itemId} item`,
                to: `/${id}`,
                icon: TestIcon,
                category,
              },
            ],
          },
        ],
      }),
    },
  }
}

function createStandaloneAccountingDomain(): WebDomain {
  return {
    id: 'accounting',
    routeMounts: {},
    capabilities: {
      nav: () => ({
        id: 'domain-accounting',
        label: 'Accounting',
        desc: 'Accounting',
        icon: TestIcon,
        defaultTo: '/cfp',
        groups: [
          {
            id: 'accounting-main',
            title: null,
            items: [
              {
                id: 'cfp',
                label: 'CFP',
                desc: 'CFP',
                to: '/cfp',
                icon: TestIcon,
                category: 'accounting',
                standaloneScene: true,
              },
              {
                id: 'lca',
                label: 'LCA',
                desc: 'LCA',
                to: '/lca',
                icon: TestIcon,
                category: 'accounting',
                standaloneScene: true,
              },
            ],
          },
        ],
      }),
    },
  }
}

describe('configured app navigation', () => {
  it('moves item-level scenes to their category without replacing the original domain scene', () => {
    const projectDomain: WebDomain = {
      id: 'project',
      routeMounts: {},
      capabilities: {
        nav: () => ({
          id: 'domain-project',
          label: 'Research Objects',
          desc: 'Research object scene',
          icon: TestIcon,
          defaultTo: '/project/research-objects',
          groups: [
            {
              id: 'project-main',
              title: null,
              items: [
                {
                  id: 'project-list',
                  label: 'Projects',
                  desc: 'Project list',
                  to: '/project/projects',
                  icon: TestIcon,
                  category: 'accounting',
                },
                {
                  id: 'project-research-objects',
                  label: 'Research Objects',
                  desc: 'Research objects',
                  to: '/project/research-objects',
                  icon: TestIcon,
                },
              ],
            },
          ],
        }),
      },
    }
    const config = createConfiguredAppNavConfig(
      [
        projectDomain,
        createDomain({ id: 'accounting', itemId: 'accounting-list' }),
      ],
      { language: 'en-US' },
    )
    const projectScene = config.scenes.find(
      (scene) => scene.id === 'domain-project',
    )
    const projectListScene = config.scenes.find(
      (scene) => scene.id === 'domain-project--project-list',
    )
    const accountingCategory = config.categories.find((category) =>
      category.sceneIds.includes('domain-accounting'),
    )

    expect(projectScene?.groups[0]?.items.map((item) => item.id)).toEqual([
      'project-research-objects',
    ])
    expect(projectListScene).toMatchObject({
      label: 'Projects',
      defaultTo: '/project/projects',
    })
    expect(accountingCategory?.sceneIds[0]).toBe(
      'domain-project--project-list',
    )
  })

  it('uses the categorized scene when no uncategorized item remains visible', () => {
    const config = createConfiguredAppNavConfig(
      [
        createDomain({
          id: 'project',
          itemId: 'project-list',
          category: 'accounting',
        }),
      ],
      { language: 'en-US' },
    )

    expect(config.scenes.map((scene) => scene.id)).toEqual([
      'domain-project--project-list',
    ])
    expect(config.defaultSceneId).toBe('domain-project--project-list')
  })

  it('promotes standalone items to sibling scenes', () => {
    const config = createConfiguredAppNavConfig(
      [createStandaloneAccountingDomain()],
      { language: 'en-US' },
    )

    expect(config.scenes.map((scene) => [scene.label, scene.defaultTo])).toEqual([
      ['CFP', '/cfp'],
      ['LCA', '/lca'],
    ])
  })
})
