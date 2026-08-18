import type { ReactNode } from 'react'

import { cn } from '#/lib/utils.ts'

export interface DetailHeaderActionsProps {
  children: ReactNode
  className?: string
}

export interface DetailPageHeaderProps {
  actions?: ReactNode
  className?: string
  description?: ReactNode
  leading?: ReactNode
  title: ReactNode
}

export function DetailHeaderActions({
  children,
  className,
}: DetailHeaderActionsProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-end gap-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function DetailPageHeader({
  actions,
  className,
  description,
  leading,
  title,
}: DetailPageHeaderProps) {
  return (
    <header
      className={cn(
        'flex min-h-10 shrink-0 flex-wrap items-center justify-between gap-3 px-1 pt-1',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {leading}
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-semibold text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="truncate text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <DetailHeaderActions>{actions}</DetailHeaderActions> : null}
    </header>
  )
}
