import * as React from 'react'
import { BoxIcon, CheckIcon, LogOut, RefreshCwIcon } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

import { Button } from '../../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'
import { Spinner } from '../../ui/spinner'
import { clearAuthSessionSideEffects } from '../../../lib/auth-session'
import { crossDomainRoutePaths } from '../../../lib/cross-domain-route-paths'
import { useTranslation } from '../../../lib/i18n'
import { cn } from '../../../lib/utils'
import {
  getSessionCredential,
  getSessionWorkspaceId,
} from '../../../lib/session-cookie'
import {
  selectWorkspaceId,
  type WorkspaceSelectionItem,
} from '../../../lib/workspace-session'

import defaultUserAvatar from './assets/default-user-avatar.png'
import { MOCK_USER } from './nav-config'
import { useAvailableWorkspaces, useCurrentUserProfile } from './queries'

type WorkspaceMenuItemProps = {
  currentWorkspaceId: string | null
  isSwitching: boolean
  onSelect: (workspace: WorkspaceSelectionItem) => void | Promise<void>
  switchingWorkspaceId: string | null
  workspace: WorkspaceSelectionItem
}

function getWorkspaceSecondaryText(
  workspace: WorkspaceSelectionItem,
  fallbackLabels: {
    organization: string
    personal: string
  },
) {
  if (workspace.belongType === 'PERSIONAL') {
    return fallbackLabels.personal
  }

  return (
    workspace.belongDisplayName?.trim() ||
    workspace.belongName?.trim() ||
    workspace.describe?.trim() ||
    (workspace.belongType === 'ORGANIZATION'
      ? fallbackLabels.organization
      : '')
  )
}

function WorkspaceMenuItem({
  currentWorkspaceId,
  isSwitching,
  onSelect,
  switchingWorkspaceId,
  workspace,
}: WorkspaceMenuItemProps) {
  const { t } = useTranslation()
  const isCurrent = currentWorkspaceId === workspace.id
  const isThisSwitching = switchingWorkspaceId === workspace.id
  const secondaryText = getWorkspaceSecondaryText(workspace, {
    organization: t.common.workspace.organization,
    personal: t.common.workspace.personal,
  })
  const handleSelect = React.useCallback(() => {
    if (isSwitching) {
      return
    }

    void onSelect(workspace)
  }, [isSwitching, onSelect, workspace])

  return (
    <DropdownMenuItem
      closeOnClick={false}
      label={workspace.name}
      className={cn(
        'min-h-14 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 focus:bg-muted',
        isCurrent && 'bg-primary/5 text-primary focus:bg-primary/10',
      )}
      onClick={handleSelect}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground',
          isCurrent && 'bg-primary/10 text-primary',
        )}
      >
        <BoxIcon aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm leading-5 font-semibold text-foreground">
            {workspace.name}
          </span>
          {isCurrent ? (
            <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[11px] leading-4 font-medium text-primary">
              {t.common.workspace.current}
            </span>
          ) : null}
        </span>
        {secondaryText ? (
          <span className="mt-0.5 block truncate text-xs leading-4 text-muted-foreground">
            {secondaryText}
          </span>
        ) : null}
      </span>
      {isThisSwitching ? (
        <Spinner className="size-4 shrink-0 text-primary" />
      ) : isCurrent ? (
        <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
      ) : null}
    </DropdownMenuItem>
  )
}

export function AccountPopover() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hasSessionCredential = Boolean(getSessionCredential())
  const profileQuery = useCurrentUserProfile({
    enabled: hasSessionCredential,
  })
  const workspaceQuery = useAvailableWorkspaces({
    enabled: hasSessionCredential,
  })
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = React.useState<
    string | null
  >(null)
  const [workspaceSwitchFailed, setWorkspaceSwitchFailed] = React.useState(false)
  const profile = profileQuery.data
  const currentWorkspaceId = getSessionWorkspaceId()
  const workspaceOptions = workspaceQuery.data ?? []
  const hasWorkspaceOptions = workspaceOptions.length > 0
  const isWorkspaceLoading =
    workspaceQuery.isLoading || (workspaceQuery.isFetching && !hasWorkspaceOptions)
  const accountName =
    profile?.realName?.trim() ||
    profile?.nickname?.trim() ||
    profile?.username?.trim() ||
    MOCK_USER.name
  const accountContact =
    profile?.email?.trim() || profile?.phone?.trim() || MOCK_USER.email

  const handleLogoutClick = React.useCallback(() => {
    clearAuthSessionSideEffects()
    void navigate({ to: crossDomainRoutePaths.uic.login })
  }, [navigate])

  const handleWorkspaceRetry = React.useCallback(() => {
    setWorkspaceSwitchFailed(false)
    void workspaceQuery.refetch()
  }, [workspaceQuery.refetch])

  const handleWorkspaceSelect = React.useCallback(
    async (workspace: WorkspaceSelectionItem) => {
      if (switchingWorkspaceId) {
        return
      }

      setWorkspaceSwitchFailed(false)
      setSwitchingWorkspaceId(workspace.id)

      try {
        await selectWorkspaceId(workspace.id)
        window.location.reload()
      } catch (error) {
        console.error('Failed to switch workspace:', error)
        setWorkspaceSwitchFailed(true)
        setSwitchingWorkspaceId(null)
      }
    },
    [switchingWorkspaceId],
  )

  const isWorkspaceSubmenuDisabled = !hasSessionCredential

  const workspaceSubmenuContent = React.useMemo(() => {
    if (isWorkspaceLoading) {
      return (
        <div className="flex min-h-20 items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground">
          <Spinner />
          <span>{t.common.workspace.loading}</span>
        </div>
      )
    }

    if (workspaceQuery.isError) {
      return (
        <DropdownMenuItem
          closeOnClick={false}
          className="min-h-11 cursor-pointer rounded-lg px-2.5 py-2 text-sm"
          onClick={handleWorkspaceRetry}
        >
          <RefreshCwIcon aria-hidden="true" className="size-4" />
          <span>{t.common.workspace.retry}</span>
        </DropdownMenuItem>
      )
    }

    if (!hasWorkspaceOptions) {
      return (
        <div className="px-3 py-4 text-sm leading-5 text-muted-foreground">
          {t.common.workspace.emptyTitle}
        </div>
      )
    }

    return workspaceOptions.map((workspace) => (
      <WorkspaceMenuItem
        key={workspace.id}
        currentWorkspaceId={currentWorkspaceId}
        isSwitching={Boolean(switchingWorkspaceId)}
        switchingWorkspaceId={switchingWorkspaceId}
        workspace={workspace}
        onSelect={handleWorkspaceSelect}
      />
    ))
  }, [
    currentWorkspaceId,
    handleWorkspaceRetry,
    handleWorkspaceSelect,
    hasWorkspaceOptions,
    isWorkspaceLoading,
    switchingWorkspaceId,
    t.common.workspace.emptyTitle,
    t.common.workspace.loading,
    t.common.workspace.retry,
    workspaceOptions,
    workspaceQuery.isError,
  ])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            aria-label={t.common.shell.account.menu}
            className="h-8 gap-2 px-2 active:translate-y-0"
          />
        }
      >
        <img
          src={defaultUserAvatar}
          alt=""
          aria-hidden="true"
          className="size-6 shrink-0 rounded-full border border-border object-cover"
        />
        <span className="max-w-28 truncate text-sm font-medium text-foreground">
          {accountName}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-[300px] rounded-lg border border-border/70 p-0 shadow-xl"
      >
        <div className="p-2.5 pb-0">
          <div className="rounded-lg bg-muted px-3 py-2.5">
            <div className="flex items-start gap-3">
              <img
                src={defaultUserAvatar}
                alt={accountName}
                className="size-11 shrink-0 rounded-full border border-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="min-w-0">
                  <div className="truncate text-[15px] leading-5 font-semibold text-foreground">
                    {accountName}
                  </div>
                </div>
                <div className="mt-0.5 truncate text-xs leading-4 text-muted-foreground">
                  {accountContact}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-1 border-t border-border/70 p-2.5">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              disabled={isWorkspaceSubmenuDisabled}
              openOnHover
              delay={80}
              className="h-10 cursor-pointer gap-2 rounded-lg px-2.5 text-[15px] font-semibold data-disabled:pointer-events-none data-disabled:opacity-50"
            >
              <BoxIcon aria-hidden="true" className="text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">
                {t.common.shell.account.switchWorkspace}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent
              side="left"
              align="start"
              sideOffset={8}
              className="max-h-[min(60dvh,380px)] w-[300px] rounded-lg border border-border/70 p-2 shadow-xl"
            >
              {workspaceSwitchFailed ? (
                <div className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
                  {t.common.workspace.switchFailed}
                </div>
              ) : null}
              <div className="flex flex-col gap-1">{workspaceSubmenuContent}</div>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator className="mx-0 my-1.5" />

          <DropdownMenuItem
            variant="destructive"
            className="h-10 cursor-pointer gap-2 rounded-lg px-2.5 text-[15px] font-semibold"
            onClick={handleLogoutClick}
          >
            <LogOut aria-hidden="true" className="size-4" />
            <span>{t.common.shell.account.logout}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
