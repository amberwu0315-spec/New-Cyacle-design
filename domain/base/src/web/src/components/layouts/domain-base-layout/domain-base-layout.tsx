import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '../../../lib/utils'

export type DomainBaseLayoutProps = ComponentPropsWithoutRef<'div'>

export function DomainBaseLayout({
  children,
  className,
  ...props
}: DomainBaseLayoutProps) {
  return (
    <div
      {...props}
      data-slot="domain-base-layout"
      className={cn(
        'min-h-full bg-background px-4 py-5 sm:px-6 lg:px-8',
        className,
      )}
    >
      {children}
    </div>
  )
}
