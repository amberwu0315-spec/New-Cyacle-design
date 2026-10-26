// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearSessionCredential,
  setSessionCredential,
  setSessionScope,
} from '#/lib/session-storage.ts'
import { configureTestWebProjectConfig } from '#/test/web-project-config.ts'
import {
  DocumentPreviewDialog,
  createDocumentPreviewItemFromDocument,
} from './document-preview.tsx'

const DOCUMENT_URL = '/uic.DocumentWeb/DocumentService/download?id=doc-1'

beforeEach(() => {
  configureTestWebProjectConfig()
  setSessionCredential('session-1')
  setSessionScope('scope-1')
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:http://localhost/preview-1'),
      revokeObjectURL: vi.fn(),
    }),
  )
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  clearSessionCredential()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('assistant DocumentPreviewDialog', () => {
  it('fetches inline media with session authorization instead of using the raw url', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async () => new Response('image-content', { status: 200 }),
      )

    render(
      <DocumentPreviewDialog
        open
        item={createDocumentPreviewItemFromDocument({
          id: 'doc-1',
          name: '碳排放数据.png',
          url: DOCUMENT_URL,
        })}
        onOpenChange={() => undefined}
      />,
    )

    const image = await screen.findByRole('img')

    await waitFor(() =>
      expect(image.getAttribute('src')).toBe('blob:http://localhost/preview-1'),
    )

    const [url, requestInit] = fetchSpy.mock.calls[0] ?? []
    const headers = new Headers((requestInit as RequestInit).headers)

    expect(url).toBe(DOCUMENT_URL)
    expect(headers.get('Authorization')).toBe(
      'session session-1, scope scope-1',
    )
  })

  it('downloads the attachment with authorization when no handler is provided', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async () => new Response('zip-content', { status: 200 }),
      )

    render(
      <DocumentPreviewDialog
        open
        item={createDocumentPreviewItemFromDocument({
          id: 'doc-1',
          name: '归档.zip',
          url: DOCUMENT_URL,
        })}
        onOpenChange={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '下载附件' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    const [, requestInit] = fetchSpy.mock.calls[0] ?? []
    const headers = new Headers((requestInit as RequestInit).headers)

    expect(headers.get('Authorization')).toBe(
      'session session-1, scope scope-1',
    )
    await waitFor(() =>
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1),
    )
  })
})
