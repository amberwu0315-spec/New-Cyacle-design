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
  AssistantAnchorChatAttachmentList,
  type AssistantAnchorChatAttachmentItem,
  normalizeAssistantMessageAttachment,
} from './attachment-list.tsx'

const DOCUMENT_DOWNLOAD_URL = '/doc/DocumentService/download?id=doc-1'

const attachment: AssistantAnchorChatAttachmentItem = {
  id: 'doc-1',
  name: '归档.zip',
  sizeText: '1 MB',
  mimeType: 'application/zip',
  downloadUrl: DOCUMENT_DOWNLOAD_URL,
  previewUrl: undefined,
  previewItem: undefined,
  statusText: undefined,
  errorMessage: undefined,
}

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
  cleanup()
  clearSessionCredential()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AssistantAnchorChatAttachmentList', () => {
  it('downloads the attachment with session authorization instead of navigating', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('zip-content', { status: 200 }))

    render(<AssistantAnchorChatAttachmentList attachments={[attachment]} />)

    fireEvent.click(screen.getByRole('button', { name: '下载附件 归档.zip' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    const [url, requestInit] = fetchSpy.mock.calls[0] ?? []
    const headers = new Headers((requestInit as RequestInit).headers)

    expect(url).toBe(DOCUMENT_DOWNLOAD_URL)
    expect(headers.get('Authorization')).toBe(
      'session session-1, scope scope-1',
    )
    await waitFor(() =>
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1),
    )
  })

  it('builds a previewable item with a document download url', () => {
    const item = normalizeAssistantMessageAttachment({
      id: 'doc-1',
      name: '碳排放数据.pdf',
      mimeType: 'application/pdf',
      downloadUrl: DOCUMENT_DOWNLOAD_URL,
    })

    expect(item.previewItem?.url).toBe(
      '/uic.DocumentWeb/DocumentService/download?id=doc-1',
    )
  })
})
