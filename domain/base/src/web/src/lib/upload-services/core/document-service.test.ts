// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearSessionCredential,
  setSessionCredential,
  setSessionScope,
} from '#/lib/session-storage.ts'
import { configureTestWebProjectConfig } from '#/test/web-project-config.ts'
import {
  downloadDocumentFileByUrl,
  getDocumentDownloadUrl,
} from './document-service.ts'

beforeEach(() => {
  configureTestWebProjectConfig()
  setSessionCredential('session-1')
  setSessionScope('scope-1')
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:http://localhost/download-1'),
      revokeObjectURL: vi.fn(),
    }),
  )
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(() => {
  clearSessionCredential()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('getDocumentDownloadUrl', () => {
  it('keeps the raw-version switch used by download actions', () => {
    expect(getDocumentDownloadUrl('doc-1', { useRawVersion: true })).toBe(
      '/uic.DocumentWeb/DocumentService/download?id=doc-1&useRawVersion=true',
    )
  })
})

describe('downloadDocumentFileByUrl', () => {
  it('fetches the document with session authorization before saving it', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('file-content', { status: 200 }))

    await downloadDocumentFileByUrl(
      '/uic.DocumentWeb/DocumentService/download?id=doc-1',
      '碳排放数据.pdf',
    )

    const [url, requestInit] = fetchSpy.mock.calls[0] ?? []
    const headers = new Headers((requestInit as RequestInit).headers)

    expect(url).toBe('/uic.DocumentWeb/DocumentService/download?id=doc-1')
    expect((requestInit as RequestInit).credentials).toBe('include')
    expect(headers.get('Authorization')).toBe(
      'session session-1, scope scope-1',
    )
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1)
  })

  it('surfaces the server message when the document request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'bad credential: expected one Authorization header',
        }),
        { status: 401 },
      ),
    )

    await expect(
      downloadDocumentFileByUrl(
        '/uic.DocumentWeb/DocumentService/download?id=doc-1',
        '碳排放数据.pdf',
      ),
    ).rejects.toThrow('bad credential: expected one Authorization header')
  })
})
