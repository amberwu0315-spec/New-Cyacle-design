import { getMessages, languageStore } from '#/lib/i18n/index.ts'

/**
 * 把已经取回的 Blob 交给浏览器落盘。
 *
 * 为什么不能直接把下载地址塞进 `<a href>`：DocumentWeb 是 AuthModeRequired 的
 * web 入口，凭据只在 `Authorization: session ...` 请求头里，浏览器导航发不出来，
 * 会被网关在路由前拦成 `bad credential: expected one Authorization header`。
 * 因此统一先按带鉴权的方式取 Blob，再用这里落地。
 */
export function saveBlobAsFile(blob: Blob, fileName: string) {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error(
      getMessages(languageStore.getSnapshot()).common.documentPreview
        .unsupportedEnvironment,
    )
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener noreferrer'
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  // 立即 revoke 会让部分浏览器取消下载，留出一个宏任务再回收。
  if (typeof window === 'undefined') {
    URL.revokeObjectURL(url)
    return
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
