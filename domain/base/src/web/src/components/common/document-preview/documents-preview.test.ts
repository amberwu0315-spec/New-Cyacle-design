import { beforeEach, describe, expect, it } from 'vitest'

import { configureTestWebProjectConfig } from '#/test/web-project-config.ts'

import {
  createDocumentPreviewItemFromDocument,
  createFilePreviewItem,
} from './documents-preview'

beforeEach(() => {
  configureTestWebProjectConfig()
})

describe('documents preview item resolution', () => {
  it('previews CSV files with the excel viewer without requesting PDF generation', () => {
    const item = createDocumentPreviewItemFromDocument({
      id: 'document-csv',
      name: 'activity-data.csv',
      size: 1024,
    })

    expect(item.viewerFile.viewerKind).toBe('excel')
    expect(item.viewerFile.fileKind).toBe('excel')
    expect(item.viewerFile.url).toContain(
      '/uic.DocumentWeb/DocumentService/download?id=document-csv',
    )
    expect(item.viewerFile.url).not.toContain('preview=generate')
  })

  it('keeps PDF-convertible documents on generated PDF previews', () => {
    const item = createDocumentPreviewItemFromDocument({
      id: 'document-docx',
      name: 'briefing.docx',
      size: 1024,
    })

    expect(item.viewerFile.viewerKind).toBe('pdf')
    expect(item.viewerFile.fileKind).toBe('word')
    expect(item.viewerFile.url).toContain('preview=generate')
  })

  it('uses the original file URL for CSV file-service attachments', () => {
    const item = createFilePreviewItem({
      id: 'file-csv',
      name: 'supplier-factors.csv',
      url: 'https://example.com/files/supplier-factors.csv',
    })

    expect(item.viewerFile.viewerKind).toBe('excel')
    expect(item.viewerFile.fileKind).toBe('excel')
    expect(item.viewerFile.url).toBe(
      'https://example.com/files/supplier-factors.csv',
    )
  })
})
