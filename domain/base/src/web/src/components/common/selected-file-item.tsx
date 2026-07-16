import * as React from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { ViewerFileTypeIcon } from '@cew-lib/file-viewer-base'

import { cn } from '#/lib/utils.ts'

export interface SelectedFileItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  actions?: React.ReactNode
  compact?: boolean
  description?: React.ReactNode
  disabled?: boolean
  empty?: boolean
  fileName?: string | null
  footer?: React.ReactNode
  icon?: React.ReactNode
  loading?: boolean
  meta?: React.ReactNode
  name?: React.ReactNode
  status?: React.ReactNode
}

function SelectedFileItemIcon({
  compact,
  empty,
  fileName,
  icon,
  loading,
}: {
  compact: boolean
  empty: boolean
  fileName?: string | null
  icon?: React.ReactNode
  loading?: boolean
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground',
        empty
          ? 'border-dashed bg-muted/30'
          : 'border-border/70 text-primary ring-1 ring-border/30',
        compact ? 'size-8' : 'size-9',
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : icon ? (
        icon
      ) : fileName ? (
        <ViewerFileTypeIcon fileName={fileName} className="h-5 w-auto" />
      ) : (
        <FileText className="size-4" />
      )}
    </div>
  )
}

export function SelectedFileItem({
  actions,
  children,
  className,
  compact = false,
  description,
  disabled = false,
  empty = false,
  fileName,
  footer,
  icon,
  loading = false,
  meta,
  name,
  status,
  ...props
}: SelectedFileItemProps) {
  return (
    <div
      aria-busy={loading || undefined}
      data-empty={empty ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      className={cn(
        'group/selected-file flex min-w-0 flex-col gap-2 rounded-md border border-border bg-background transition-colors',
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5',
        !disabled && 'hover:border-primary/30 hover:bg-muted/20',
        empty && 'border-dashed bg-muted/20',
        disabled && 'opacity-60',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <SelectedFileItemIcon
            compact={compact}
            empty={empty}
            fileName={fileName}
            icon={icon}
            loading={loading}
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="min-w-0 truncate text-sm font-medium text-foreground">
              {name}
            </div>
            {description || meta || status ? (
              <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {description ? (
                  <span className="min-w-0 truncate">{description}</span>
                ) : null}
                {meta ? <span className="min-w-0 truncate">{meta}</span> : null}
                {status ? <span className="min-w-0 truncate">{status}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        ) : null}
      </div>
      {children ? (
        <div className={cn('min-w-0', compact ? 'pl-10' : 'pl-11')}>
          {children}
        </div>
      ) : null}
      {footer ? (
        <div className={cn('min-w-0', compact ? 'pl-10' : 'pl-11')}>
          {footer}
        </div>
      ) : null}
    </div>
  )
}
