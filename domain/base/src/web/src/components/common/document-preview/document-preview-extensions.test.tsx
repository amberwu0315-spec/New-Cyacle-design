// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearSessionCredential,
  setSessionCredential,
  setSessionScope,
} from '#/lib/session-storage.ts'
import { configureTestWebProjectConfig } from '#/test/web-project-config.ts'

import { DocumentPreviewDialog } from './document-preview-dialog'
import { registerDocumentPreviewExtension } from './document-preview-extensions'
import { createDocumentPreviewItem } from './documents-preview'

vi.mock('@cew-lib/file-viewer-excel', () => ({
  ExcelContent: ({
    excel,
    file,
    toolbar,
  }: {
    excel?: { onReady?: unknown }
    file?: { url?: string } | null
    toolbar?: {
      renderActions?: (input: { defaultActions: ReactNode }) => ReactNode
    }
  }) => (
    <div data-testid="excel-viewer">
      <span data-testid="excel-url">{file?.url}</span>
      <span data-testid="excel-on-ready">{typeof excel?.onReady}</span>
      <div data-testid="excel-toolbar">
        {toolbar?.renderActions?.({
          defaultActions: <span data-testid="default-actions" />,
        })}
      </div>
    </div>
  ),
}))

describe('document preview extensions', () => {
  let disposeExtension: (() => void) | undefined

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
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('excel-content', { status: 200 }),
    )
  })

  afterEach(() => {
    disposeExtension?.()
    disposeExtension = undefined
    cleanup()
    clearSessionCredential()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function renderPreview() {
    return render(
      <DocumentPreviewDialog
        open
        item={createDocumentPreviewItem({
          id: 'document-1',
          name: '数据记录导入.xlsx',
        })}
        onOpenChange={() => undefined}
      />,
    )
  }

  function registerPanelExtension() {
    return registerDocumentPreviewExtension({
      id: 'record-preview',
      match: ({ viewerKind }) => viewerKind === 'excel',
      toolbarAction: () => ({ label: '新增记录' }),
      renderSidePanel: () => (
        <div data-testid="extension-panel">extension-panel</div>
      ),
    })
  }

  it('renders extension actions and toggles their side panel', async () => {
    disposeExtension = registerPanelExtension()

    renderPreview()

    const action = await screen.findByLabelText('新增记录')

    expect(screen.queryByTestId('extension-panel')).toBeNull()

    fireEvent.click(action)
    expect(screen.getByTestId('extension-panel')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('新增记录'))
    expect(screen.queryByTestId('extension-panel')).toBeNull()
  })

  it('forwards extension viewer options to the viewer', async () => {
    const onReady = vi.fn()

    disposeExtension = registerDocumentPreviewExtension({
      id: 'record-preview',
      match: ({ viewerKind }) => viewerKind === 'excel',
      toolbarAction: () => ({ label: '新增记录' }),
      viewerOptions: { excel: { onReady } },
    })

    renderPreview()

    await waitFor(() =>
      expect(screen.getByTestId('excel-on-ready').textContent).toBe('function'),
    )
  })

  it('closes the extension panel when the version history opens', async () => {
    disposeExtension = registerPanelExtension()

    renderPreview()

    fireEvent.click(await screen.findByLabelText('新增记录'))
    expect(screen.getByTestId('extension-panel')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('版本历史'))
    expect(screen.queryByTestId('extension-panel')).toBeNull()
  })
})
