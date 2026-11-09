import { LabVariantSwitcher } from '#/shell/switcher.tsx'
import { useLabVariant } from '#/shell/variant.ts'
import { labVariants } from '#/shell/variants.ts'

/**
 * lab 的入口壳：按 `?v=` 选择变体，并挂上切换器。
 *
 * 解析不到的变体会退回 `baseline`，不会白屏——探索时手滑改错参数很常见。
 */
export function LabShell() {
  const variant = useLabVariant()
  const Layout = labVariants[variant] ?? labVariants.baseline

  return (
    <>
      <Layout />
      <LabVariantSwitcher />
    </>
  )
}
