// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { configureTestWebProjectConfig } from '#/test/web-project-config.ts'
import type { AppLayoutAsyncState } from './app-layout.tsx'
import { AccountPopover } from './account-popover.tsx'

vi.mock('#/lib/upload-services/file-service.ts', () => ({
  getFilePublicDownloadUrl: (recordId?: string | null) =>
    recordId
      ? `/file.FileWeb/FileService/public/download?recordId=${recordId}&image=thumb%3Amedium`
      : undefined,
}))

beforeEach(() => {
  configureTestWebProjectConfig()
})

afterEach(() => {
  cleanup()
})

describe('AccountPopover', () => {
  it('shows the current profile avatar and falls back when it fails to load', () => {
    const profileQuery = {
      data: {
        avatarFileId: 'avatar-file-1',
        username: '测试用户',
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      isSuccess: true,
      refetch: vi.fn(),
    } satisfies AppLayoutAsyncState<{
      avatarFileId: string
      username: string
    }>
    const workspaceQuery = {
      data: [],
      isError: false,
      isFetching: false,
      isLoading: false,
      isSuccess: true,
      refetch: vi.fn(),
    } satisfies AppLayoutAsyncState<[]>
    const { container } = render(
      <AccountPopover
        currentWorkspaceScope={null}
        hasSessionCredential
        onLogout={vi.fn()}
        onWorkspaceSelect={vi.fn()}
        profileQuery={profileQuery}
        workspaceQuery={workspaceQuery}
      />,
    )
    const avatar = container.querySelector<HTMLImageElement>(
      '[data-slot="account-trigger"] img',
    )
    const profileAvatarUrl =
      '/file.FileWeb/FileService/public/download?recordId=avatar-file-1&image=thumb%3Amedium'

    expect(avatar?.getAttribute('src')).toBe(profileAvatarUrl)

    fireEvent.error(avatar!)

    expect(avatar?.getAttribute('src')).not.toBe(profileAvatarUrl)
  })
})
