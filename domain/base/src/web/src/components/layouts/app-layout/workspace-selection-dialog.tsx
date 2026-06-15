import * as React from 'react'
import {
  Building2Icon,
  CheckIcon,
  ChevronRightIcon,
  RefreshCwIcon,
} from 'lucide-react'

import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../../ui/empty'
import { Spinner } from '../../ui/spinner'
import { useTranslation } from '../../../lib/i18n'
import { cn } from '../../../lib/utils'
import type { WorkspaceSelectionItem } from '../../../lib/workspace-session'

type WorkspaceSelectionDialogProps = {
  open: boolean
  workspaces: Array<WorkspaceSelectionItem>
  currentWorkspaceId?: string | null
  isError?: boolean
  isLoading?: boolean
  isSwitchError?: boolean
  onRetry?: () => void
  onSelect: (workspace: WorkspaceSelectionItem) => void | Promise<void>
  switchingWorkspaceId?: string | null
}

type WorkspaceOptionButtonProps = {
  currentWorkspaceId?: string | null
  onSelect: (workspace: WorkspaceSelectionItem) => void | Promise<void>
  switchingWorkspaceId?: string | null
  workspace: WorkspaceSelectionItem
}

function getWorkspaceSecondaryText(workspace: WorkspaceSelectionItem) {
  return (
    workspace.belongDisplayName?.trim() ||
    workspace.belongName?.trim() ||
    workspace.describe?.trim() ||
    ''
  )
}

function WorkspaceOptionButton({
  currentWorkspaceId,
  onSelect,
  switchingWorkspaceId,
  workspace,
}: WorkspaceOptionButtonProps) {
  const { t } = useTranslation()
  const isCurrent = currentWorkspaceId === workspace.id
  const isSwitching = Boolean(switchingWorkspaceId)
  const isThisSwitching = switchingWorkspaceId === workspace.id
  const secondaryText = getWorkspaceSecondaryText(workspace)
  const handleSelect = React.useCallback(() => {
    if (isSwitching) {
      return
    }

    void onSelect(workspace)
  }, [isSwitching, onSelect, workspace])

  return (
    <button
      type="button"
      className={cn(
        'group flex min-h-16 w-full items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-100',
        isCurrent && 'border-primary/50 bg-primary/5',
      )}
      aria-busy={isThisSwitching || undefined}
      disabled={isSwitching}
      onClick={handleSelect}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Building2Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {workspace.name}
          </span>
          {isCurrent ? (
            <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] leading-4 font-medium text-primary">
              {t.common.workspace.current}
            </span>
          ) : null}
        </span>
        {secondaryText ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {secondaryText}
          </span>
        ) : null}
      </span>
      {isThisSwitching ? (
        <Spinner className="size-4 shrink-0 text-primary" />
      ) : isCurrent ? (
        <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
      ) : (
        <ChevronRightIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
        />
      )}
    </button>
  )
}

export function WorkspaceSelectionDialog({
  currentWorkspaceId,
  isError = false,
  isLoading = false,
  isSwitchError = false,
  onRetry,
  onSelect,
  open,
  switchingWorkspaceId,
  workspaces,
}: WorkspaceSelectionDialogProps) {
  const { t } = useTranslation()
  const hasWorkspaces = workspaces.length > 0

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-[520px]"
      >
        <DialogHeader className="px-5 pt-5 pb-4">
          <DialogTitle>{t.common.workspace.title}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-5 pb-5 text-sm text-muted-foreground">
            <Spinner />
            <span>{t.common.workspace.loading}</span>
          </div>
        ) : null}

        {!isLoading && (isError || !hasWorkspaces) ? (
          <div className="px-5 pb-5">
            <Empty className="min-h-[220px] border border-border/70">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Building2Icon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>{t.common.workspace.emptyTitle}</EmptyTitle>
                <EmptyDescription>
                  {t.common.workspace.emptyDescription}
                </EmptyDescription>
              </EmptyHeader>
              {onRetry ? (
                <EmptyContent>
                  <Button type="button" variant="outline" onClick={onRetry}>
                    <RefreshCwIcon data-icon="inline-start" />
                    {t.common.workspace.retry}
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          </div>
        ) : null}

        {!isLoading && !isError && hasWorkspaces ? (
          <div className="max-h-[min(50dvh,360px)] overflow-y-auto px-2 pb-2">
            <div className="flex flex-col gap-2">
              {isSwitchError ? (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
                  {t.common.workspace.switchFailed}
                </div>
              ) : null}
              {workspaces.map((workspace) => (
                <WorkspaceOptionButton
                  key={workspace.id}
                  currentWorkspaceId={currentWorkspaceId}
                  workspace={workspace}
                  onSelect={onSelect}
                  switchingWorkspaceId={switchingWorkspaceId}
                />
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
