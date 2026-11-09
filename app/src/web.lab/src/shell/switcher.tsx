import { buildVariantHref, buildVariantResetHref, useLabVariant } from '#/shell/variant.ts'
import { labVariantIds } from '#/shell/variants.ts'

/**
 * 悬浮变体切换器。只在 /lab 下出现，正式版看不到。
 * 用原生 <a>：切变体要整页刷新，避免把上一个变体的状态带进来。
 */
export function LabVariantSwitcher() {
  const active = useLabVariant()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-lg border border-neutral-200 bg-white/95 px-2 py-1.5 text-xs shadow-lg backdrop-blur">
      <span className="px-1 text-neutral-400">变体</span>
      {labVariantIds.map((id) => (
        <a
          key={id}
          href={buildVariantHref(id)}
          className={
            id === active
              ? 'rounded bg-neutral-900 px-2 py-1 text-white'
              : 'rounded px-2 py-1 text-neutral-600 hover:bg-neutral-100'
          }
        >
          {id}
        </a>
      ))}
      <a
        href={buildVariantResetHref()}
        className="ml-1 rounded px-2 py-1 text-neutral-400 hover:bg-neutral-100"
        title="清掉 v 参数，回到默认变体"
      >
        重置
      </a>
    </div>
  )
}
