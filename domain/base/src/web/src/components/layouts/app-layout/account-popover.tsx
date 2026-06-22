import * as React from 'react'
import { BoxIcon, CheckIcon, GlobeIcon, LogOut, RefreshCwIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'
import {
  formatMessage,
  languageStore,
  useTranslation,
} from '#/lib/i18n/index.ts'
import type { SupportedLanguage } from '#/lib/i18n/index.ts'
import { cn } from '#/lib/utils.ts'
import type {
  WorkspaceSelectionItem,
  WorkspaceSelectionResult,
} from './workspace-selection.ts'

import defaultUserAvatar from '#/components/layouts/app-layout/assets/default-user-avatar.png'
import type {
  AppLayoutAsyncState,
  AppLayoutUserProfile,
} from '#/components/layouts/app-layout/app-layout.tsx'

export type AccountPopoverProps = {
  currentWorkspaceScope: string | null
  hasSessionCredential: boolean
  onLogout: () => void
  onWorkspaceSelect: (
    workspace: WorkspaceSelectionItem,
  ) => Promise<WorkspaceSelectionResult>
  profileQuery: AppLayoutAsyncState<AppLayoutUserProfile>
  workspaceQuery: AppLayoutAsyncState<Array<WorkspaceSelectionItem>>
}

const ACCOUNT_LANGUAGE_OPTIONS: Array<SupportedLanguage> = ['en-US', 'zh-CN']

type WorkspaceMenuItemProps = {
  currentWorkspaceScope: string | null
  isSwitching: boolean
  onSelect: (workspace: WorkspaceSelectionItem) => void | Promise<void>
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
  currentWorkspaceScope,
  isSwitching,
  onSelect,
  workspace,
}: WorkspaceMenuItemProps) {
  const { t } = useTranslation()
  const isCurrent = currentWorkspaceScope === workspace.scope.trim()
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
      <span className="min-w-0 flex-1 text-left">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm leading-5 font-semibold text-foreground">
            {workspace.name}
          </span>
          {isCurrent ? (
            <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] leading-4 font-medium text-primary">
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
      {isCurrent ? (
        <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
      ) : null}
    </DropdownMenuItem>
  )
}

export function AccountPopover({
  currentWorkspaceScope,
  hasSessionCredential,
  onLogout,
  onWorkspaceSelect,
  profileQuery,
  workspaceQuery,
}: AccountPopoverProps) {
  const { language, t } = useTranslation()
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = React.useState<
    string | null
  >(null)
  const [workspaceSwitchFailed, setWorkspaceSwitchFailed] = React.useState(false)
  const profile = profileQuery.data
  const workspaceOptions = workspaceQuery.data ?? []
  const hasWorkspaceOptions = workspaceOptions.length > 0
  const isWorkspaceLoading =
    workspaceQuery.isLoading || (workspaceQuery.isFetching && !hasWorkspaceOptions)
  const isProfileLoading =
    hasSessionCredential &&
    !profile &&
    (Boolean(profileQuery.isLoading) || profileQuery.isFetching)
  const accountName = profile?.username?.trim() ?? ''
  const accountPhone = profile?.phone?.trim()
  const accountEmail = profile?.email?.trim()
  const currentWorkspace = React.useMemo(() => {
    if (!currentWorkspaceScope) {
      return null
    }

    return (
      workspaceOptions.find(
        (workspace) => workspace.scope.trim() === currentWorkspaceScope,
      ) ?? null
    )
  }, [currentWorkspaceScope, workspaceOptions])
  const currentWorkspaceName = currentWorkspace?.name.trim() ?? ''
  const currentLanguageName = t.common.language.names[language]
  const languageMenuLabel = formatMessage(t.common.language.current, {
    language: currentLanguageName,
  })

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
        await onWorkspaceSelect(workspace)
        window.location.reload()
      } catch (error) {
        console.error('Failed to switch workspace:', error)
        setWorkspaceSwitchFailed(true)
        setSwitchingWorkspaceId(null)
      }
    },
    [onWorkspaceSelect, switchingWorkspaceId],
  )

  const handleLanguageChange = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const nextLanguage = event.currentTarget.dataset
        .language as SupportedLanguage

      languageStore.setLanguage(nextLanguage)
    },
    [],
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
        currentWorkspaceScope={currentWorkspaceScope}
        isSwitching={Boolean(switchingWorkspaceId)}
        workspace={workspace}
        onSelect={handleWorkspaceSelect}
      />
    ))
  }, [
    currentWorkspaceScope,
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
            className="h-10 min-w-0 max-w-[10rem] justify-start gap-2 px-2 active:translate-y-0"
          />
        }
      >
        {isProfileLoading ? (
          <Skeleton aria-hidden="true" className="h-10 w-24 rounded-lg" />
        ) : (
          <>
            <img
              src={defaultUserAvatar}
              alt=""
              aria-hidden="true"
              className="size-7 shrink-0 rounded-full border border-border object-cover"
            />
            <span className="max-w-full truncate text-sm font-semibold text-foreground">
              {accountName}
            </span>
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-[300px] rounded-lg border border-border/70 p-0 shadow-xl"
      >
        <div className="p-2.5 pb-0">
          <div className="rounded-lg bg-muted px-3 py-2.5">
            {isProfileLoading ? (
              <div aria-hidden="true" className="flex items-start gap-3">
                <Skeleton className="size-11 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ) : (
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
                  {accountPhone || accountEmail ? (
                    <div className="mt-0.5 flex flex-col gap-0.5 text-xs leading-4 text-muted-foreground">
                      {accountPhone ? <div className="truncate">{accountPhone}</div> : null}
                      {accountEmail ? <div className="truncate">{accountEmail}</div> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-1 border-t border-border/70 p-2.5">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              disabled={isWorkspaceSubmenuDisabled}
              openOnHover
              delay={80}
              className="min-h-12 cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-[15px] font-semibold data-disabled:pointer-events-none data-disabled:opacity-50"
            >
              <BoxIcon aria-hidden="true" className="text-muted-foreground" />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate">
                  {t.common.shell.account.switchWorkspace}
                </span>
                {currentWorkspaceName ? (
                  <span className="mt-0.5 inline-flex max-w-full rounded-md bg-muted px-1.5 py-0.5 text-[11px] leading-4 font-medium text-foreground/80">
                    <span className="min-w-0 truncate">
                      {currentWorkspaceName}
                    </span>
                  </span>
                ) : null}
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

          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              openOnHover
              delay={80}
              aria-label={languageMenuLabel}
              className="min-h-12 cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-[15px] font-semibold"
            >
              <GlobeIcon aria-hidden="true" className="text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-left">
                {t.common.shell.account.languageSettings}
              </span>
              <span className="max-w-20 shrink-0 truncate text-xs leading-4 font-medium text-muted-foreground">
                {currentLanguageName}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent
              side="left"
              align="start"
              sideOffset={8}
              className="w-44 rounded-lg border border-border/70 p-2 shadow-xl"
            >
              <div className="flex flex-col gap-1">
                {ACCOUNT_LANGUAGE_OPTIONS.map((item) => {
                  const isActive = item === language

                  return (
                    <DropdownMenuItem
                      key={item}
                      data-language={item}
                      aria-current={isActive ? 'true' : undefined}
                      className={cn(
                        'h-9 cursor-pointer gap-2 rounded-lg px-2.5 text-sm',
                        isActive && 'bg-primary/5 text-primary focus:bg-primary/10',
                      )}
                      onClick={handleLanguageChange}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {t.common.language.names[item]}
                      </span>
                      {isActive ? (
                        <CheckIcon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-primary"
                        />
                      ) : null}
                    </DropdownMenuItem>
                  )
                })}
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator className="mx-0 my-1.5" />

          <DropdownMenuItem
            variant="destructive"
            className="h-10 cursor-pointer gap-2 rounded-lg px-2.5 text-[15px] font-semibold"
            onClick={onLogout}
          >
            <LogOut aria-hidden="true" className="size-4" />
            <span>{t.common.shell.account.logout}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
