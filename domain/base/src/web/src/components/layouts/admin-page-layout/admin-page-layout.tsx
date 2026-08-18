import type { ReactNode } from 'react'

export interface AdminPageLayoutProps {
  children: ReactNode
  description?: ReactNode
  title: ReactNode
}

/** Admin 列表页统一外壳，内容区域占满剩余高度并由业务内容管理滚动。 */
export function AdminPageLayout({ children, description, title }: AdminPageLayoutProps) {
  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <header className="flex min-h-8 shrink-0 items-center px-4 pt-4 sm:px-5 sm:pt-5 lg:px-6">
        <h1 className="min-w-0 truncate text-lg font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h1>
        {description ? <p className="sr-only">{description}</p> : null}
      </header>
      <div className="min-h-0 flex-1 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 lg:px-6">
        {children}
      </div>
    </section>
  )
}
