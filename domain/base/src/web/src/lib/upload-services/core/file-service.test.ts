// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchDocumentBlobByUrl,
  getDocumentDownloadUrl,
  uploadDocumentFile,
} from '#/lib/upload-services/core/document-service.ts'
import {
  fetchFileDownloadBlob,
  getFileDownloadUrl,
  uploadPublicFile,
} from '#/lib/upload-services/core/file-service.ts'
import { resolveServiceUrl } from '#/lib/upload-services/core/upload-service.shared.ts'
import { configureTestWebProjectConfig } from '#/test/web-project-config.ts'
import {
  clearSessionCredential,
  setSessionCredential,
  setSessionScope,
} from '#/lib/session-storage.ts'

beforeEach(() => {
  const localStorageStore = new Map<string, string>()

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => localStorageStore.get(key) ?? null,
      removeItem: (key: string) => {
        localStorageStore.delete(key)
      },
      setItem: (key: string, value: string) => {
        localStorageStore.set(key, value)
      },
    },
  })

  configureTestWebProjectConfig()
})

afterEach(() => {
  vi.restoreAllMocks()
  clearSessionCredential()
})

describe('resolveServiceUrl', () => {
  it('normalizes service paths and optional host prefixes', () => {
    expect(resolveServiceUrl('file.FileWeb/FileService/public/upload')).toBe(
      '/file.FileWeb/FileService/public/upload',
    )
    expect(
      resolveServiceUrl(
        '/file.FileWeb/FileService/public/upload',
        'https://api.example.com/',
      ),
    ).toBe('https://api.example.com/file.FileWeb/FileService/public/upload')
  })
})

describe('getFileDownloadUrl', () => {
  it('builds the download url from the current project api host', () => {
    expect(
      getFileDownloadUrl('89ff7567-47ff-4131-be16-0d62babaab5b'),
    ).toBe(
      '/file.FileWeb/FileService/download?recordId=89ff7567-47ff-4131-be16-0d62babaab5b',
    )
  })

  it('returns undefined when recordId is empty', () => {
    expect(getFileDownloadUrl(undefined)).toBeUndefined()
  })

  it('attaches session authorization when fetching private file blobs', async () => {
    setSessionCredential('session-1')
    setSessionScope('scope-1')

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('file-content', {
        status: 200,
      }),
    )

    const blob = await fetchFileDownloadBlob('file-1')
    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit
    const headers = new Headers(requestInit.headers)

    expect(blob.size).toBe(12)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/file.FileWeb/FileService/download?recordId=file-1',
      expect.objectContaining({
        cache: 'no-cache',
        credentials: 'include',
      }),
    )
    expect(headers.get('Authorization')).toBe('session session-1, scope scope-1')
  })

  it('uses the normalized upload url when posting public files', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'file-1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await uploadPublicFile(
      new File(['avatar'], 'avatar.png', { type: 'image/png' }),
    )

    expect(fetchSpy).toHaveBeenCalledWith(
      '/file.FileWeb/FileService/public/upload',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })
})

describe('getDocumentDownloadUrl', () => {
  it('builds the document preview url from the current project api host', () => {
    expect(
      getDocumentDownloadUrl('1b2dba65-6c9f-4b68-ad4b-34c452663d94'),
    ).toBe(
      '/uic.DocumentWeb/DocumentService/download?id=1b2dba65-6c9f-4b68-ad4b-34c452663d94',
    )
  })

  it('returns undefined when document id is empty', () => {
    expect(getDocumentDownloadUrl(undefined)).toBeUndefined()
  })

  it('uses the normalized upload url when posting organization documents', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { documentId: 'doc-1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(
      uploadDocumentFile(
        {
          file: new File(['license'], 'license.pdf', {
            type: 'application/pdf',
          }),
          organizationId: 'org-1',
        },
      ),
    ).resolves.toEqual({
      id: 'doc-1',
      documentId: 'doc-1',
      name: undefined,
      url: undefined,
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      '/uic.DocumentWeb/DocumentService/upload',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })

  it('falls back to id for legacy document upload responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'legacy-doc-1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(
      uploadDocumentFile(
        {
          file: new File(['license'], 'license.pdf', {
            type: 'application/pdf',
          }),
          organizationId: 'org-1',
        },
      ),
    ).resolves.toEqual({
      id: 'legacy-doc-1',
      documentId: undefined,
      name: undefined,
      url: undefined,
    })
  })

  it('attaches session authorization when fetching document preview blobs', async () => {
    setSessionCredential('session-1')
    setSessionScope('scope-1')

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('preview', {
        status: 200,
      }),
    )

    const blob = await fetchDocumentBlobByUrl(
      '/uic.DocumentWeb/DocumentService/download?id=doc-1',
    )

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit
    const headers = new Headers(requestInit.headers)

    expect(blob.size).toBe(7)
    expect(requestInit.credentials).toBe('include')
    expect(headers.get('Authorization')).toBe('session session-1, scope scope-1')
  })
})
