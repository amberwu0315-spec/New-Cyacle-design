// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  closeDocumentPreview,
  configureDocumentPreviewDialogRenderer,
  DocumentPreviewHost,
  openDocumentPreview,
} from './document-preview-controller'
import { createFilePreviewItem } from './documents-preview'

afterEach(() => {
  closeDocumentPreview()
  vi.restoreAllMocks()
})

describe('document preview controller', () => {
  it('opens the global preview host imperatively', () => {
    const disposeRenderer = configureDocumentPreviewDialogRenderer((props) => {
      if (!props.open || !props.item) {
        return null
      }

      return (
        <button type="button" onClick={() => props.onOpenChange(false)}>
          {props.item.name}
        </button>
      )
    })

    render(<DocumentPreviewHost />)

    act(() => {
      openDocumentPreview(
        createFilePreviewItem({
          id: 'file-1',
          name: 'preview.pdf',
          url: 'https://example.com/preview.pdf',
        }),
      )
    })

    act(() => {
      screen.getByRole('button', { name: 'preview.pdf' }).click()
    })

    expect(screen.queryByRole('button', { name: 'preview.pdf' })).toBeNull()

    disposeRenderer()
  })
})
