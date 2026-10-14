import { describe, expect, it } from 'vitest'

import { configureTestWebProjectConfig } from '#/test/web-project-config.ts'
import { configureWebProjectConfig, getWebProjectConfig } from './web-project-config.ts'

describe('AI 创建核算配置兼容性', () => {
  it('旧配置缺省时默认启用', () => {
    configureTestWebProjectConfig()
    expect(getWebProjectConfig().capabilities.lcaAiCreateAccounting.enabled).toBe(true)
  })

  it.each([true, false])('保留显式开关值 %s', (enabled) => {
    configureTestWebProjectConfig()
    const config = getWebProjectConfig()
    configureWebProjectConfig({
      ...config,
      capabilities: { ...config.capabilities, lcaAiCreateAccounting: { enabled } },
    })
    expect(getWebProjectConfig().capabilities.lcaAiCreateAccounting.enabled).toBe(enabled)
  })
})
