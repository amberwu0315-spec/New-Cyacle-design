// @vitest-environment jsdom

import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearSessionCredential,
  setSessionCredential,
  setSessionScope,
} from '#/lib/session-storage.ts'
import { configureTestWebProjectConfig } from '#/test/web-project-config.ts'

import { DocumentPreviewDialog } from './document-preview-dialog'
import { createFilePreviewItem } from './documents-preview'

vi.mock('@cew-lib/file-viewer-excel', () => ({
  ExcelContent: ({ file }: { file: { url?: string } | null }) => (
    <div data-testid="excel-viewer">{file?.url}</div>
  ),
}))

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
})

afterEach(() => {
  clearSessionCredential()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('DocumentPreviewDialog', () => {
  it('fetches file-service previews with session authorization before rendering the viewer', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('excel-content', {
        status: 200,
      }),
    )

    render(
      <DocumentPreviewDialog
        open
        item={createFilePreviewItem({
          id: 'file-1',
          name: '计算表.xlsx',
        })}
        onOpenChange={() => undefined}
      />,
    )

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    const [url, requestInit] = fetchSpy.mock.calls[0] ?? []
    const headers = new Headers((requestInit as RequestInit).headers)

    expect(url).toBe('/file.FileWeb/FileService/download?recordId=file-1')
    expect((requestInit as RequestInit).credentials).toBe('include')
    expect(headers.get('Authorization')).toBe('session session-1, scope scope-1')
  })
})
