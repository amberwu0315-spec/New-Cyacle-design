import type { ComponentType } from 'react'

import { AppLayout as BaselineLayout } from '#/shell/baseline-layout.tsx'

/**
 * 壳层变体注册表。
 *
 * 新增一个方案：
 *   1. 复制 `baseline-layout.tsx` 为 `v2-xxx-layout.tsx`，在里面改结构；
 *   2. 在下面加一行 `'v2': V2Layout`；
 *   3. 浏览器里 `?v=v2` 就能看到，切换器会自动出现这一项。
 *
 * 约束：每个变体都是"自带 Outlet 的完整壳"，不要在变体里再套别家的壳。
 */
export const labVariants: Record<string, ComponentType> = {
  baseline: BaselineLayout,
}

export const labVariantIds = Object.keys(labVariants)
