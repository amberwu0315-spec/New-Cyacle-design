import * as React from 'react'

import { fetchDocumentBlobByUrl } from '#/lib/upload-services/core/document-service.ts'

function isSameOriginUrl(url: string) {
  if (url.startsWith('/')) {
    return true
  }

  if (typeof window === 'undefined') {
    return false
  }

  try {
    return new URL(url, window.location.href).origin === window.location.origin
  } catch {
    return false
  }
}

export interface AuthorizedMediaUrlState {
  failed: boolean
  loading: boolean
  url: string | null
}

/**
 * 受保护文档地址 → 可直接交给 <img>/<video>/<iframe> 的 URL。
 *
 * DocumentWeb 的登录态只在 `Authorization` 头里，浏览器自己发起的媒体请求带不上，
 * 直接 `<img src="/uic.DocumentWeb/...">` 会 401。这里先按鉴权取回 Blob，再转成
 * object URL；跨域外链保持原样，不强行 fetch。
 */
export function useAuthorizedMediaUrl(
  sourceUrl?: string | null,
): AuthorizedMediaUrlState {
  const url = sourceUrl ?? undefined
  const shouldFetch = Boolean(url) && isSameOriginUrl(url as string)
  const [state, setState] = React.useState<AuthorizedMediaUrlState>({
    failed: false,
    loading: false,
    url: null,
  })

  React.useEffect(() => {
    if (!shouldFetch || !url) {
      setState({ failed: false, loading: false, url: null })
      return undefined
    }

    const abortController = new AbortController()
    let createdUrl: string | null = null

    setState({ failed: false, loading: true, url: null })

    void fetchDocumentBlobByUrl(url, { signal: abortController.signal })
      .then((blob) => {
        if (abortController.signal.aborted) {
          return
        }

        createdUrl = URL.createObjectURL(blob)
        setState({ failed: false, loading: false, url: createdUrl })
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setState({ failed: true, loading: false, url: null })
        }
      })

    return () => {
      abortController.abort()

      if (createdUrl && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [shouldFetch, url])

  return React.useMemo(
    () => ({
      failed: shouldFetch ? state.failed : false,
      loading: shouldFetch ? state.loading : false,
      url: shouldFetch ? state.url : (url ?? null),
    }),
    [shouldFetch, state.failed, state.loading, state.url, url],
  )
}
