import * as React from 'react'

/**
 * lab 的变体开关：通过 `?v=<id>` 在同一页面上切换壳层方案。
 *
 * 为什么不用分支：设计探索最痛的是"改完忘了上一版长什么样"。
 * 同一个 URL 加一个参数就能来回对比，比 git checkout 快一个数量级。
 */
export const LAB_VARIANT_PARAM = 'v'
export const DEFAULT_LAB_VARIANT = 'baseline'

function readVariant() {
  if (typeof window === 'undefined') {
    return DEFAULT_LAB_VARIANT
  }

  const value = new URLSearchParams(window.location.search).get(LAB_VARIANT_PARAM)

  return value?.trim() || DEFAULT_LAB_VARIANT
}

export function useLabVariant() {
  const [variant, setVariant] = React.useState(readVariant)

  React.useEffect(() => {
    const handlePopState = () => setVariant(readVariant())

    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return variant
}

/** 生成保留当前路径、只改 `v` 参数的链接。 */
export function buildVariantHref(variant: string) {
  const url = new URL(window.location.href)

  if (variant === DEFAULT_LAB_VARIANT) {
    url.searchParams.delete(LAB_VARIANT_PARAM)
  } else {
    url.searchParams.set(LAB_VARIANT_PARAM, variant)
  }

  return `${url.pathname}${url.search}`
}

/** 清掉 `v` 参数，回到默认变体。 */
export function buildVariantResetHref() {
  const url = new URL(window.location.href)
  url.searchParams.delete(LAB_VARIANT_PARAM)

  return `${url.pathname}${url.search}`
}
