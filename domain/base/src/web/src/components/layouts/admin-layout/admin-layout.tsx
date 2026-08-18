import * as React from 'react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Spinner } from '#/components/ui/spinner.tsx'
import { useTranslation } from '#/lib/i18n/index.ts'
import { cn } from '#/lib/utils.ts'

export interface AdminNavigationItem {
  description?: string
  disabled?: boolean
  icon: React.ElementType<{ className?: string }>
  id: string
  label: string
  permissionCode?: string
  to: string
}

export interface AdminNavigationGroup {
  id: string
  items: Array<AdminNavigationItem>
  title: string
}

export interface AdminLayoutProps {
  brand: React.ReactNode
  children?: React.ReactNode
  className?: string
  defaultSidebarOpen?: boolean
  navigation: Array<AdminNavigationGroup>
  sidebarFooter?: React.ReactNode
  sidebarStorageKey?: string
}

interface AdminNavigationLinkProps {
  collapsed: boolean
  item: AdminNavigationItem
  pathname: string
}

function AdminContentPending() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-white">
      <Spinner className="size-5 text-[#256fc4]" />
    </div>
  )
}

function AdminNavigationLink({
  collapsed,
  item,
  pathname,
}: AdminNavigationLinkProps) {
  const navigate = useNavigate()
  const Icon = item.icon
  const selected =
    pathname === item.to || pathname.startsWith(`${item.to}/`)

  const handleClick = React.useCallback(() => {
    if (item.disabled) return
    void navigate({ to: item.to as never })
  }, [item.disabled, item.to, navigate])

  return (
    <button
      type="button"
      aria-current={selected ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      disabled={item.disabled}
      title={collapsed ? item.label : item.description}
      className={cn(
        'group relative flex h-9 w-full items-center rounded-md text-left text-sm transition-[background-color,color,box-shadow] duration-150 before:absolute before:left-0.5 before:h-4 before:w-0.5 before:scale-y-50 before:rounded-full before:bg-[#2674c8] before:opacity-0 before:transition-[opacity,transform] before:duration-150',
        collapsed ? 'justify-center px-1.5' : 'gap-2.5 px-2.5',
        selected
          ? 'bg-[#eaf3fc] font-semibold text-[#145fae] shadow-[inset_0_0_0_1px_rgba(37,111,196,0.08)] before:scale-y-100 before:opacity-100'
          : 'text-[#27303d] hover:bg-[#f1f5f9] hover:text-[#165fae]',
        item.disabled &&
          'cursor-not-allowed text-[#9aa3af] opacity-60 hover:bg-transparent hover:text-[#9aa3af]',
      )}
      onClick={handleClick}
    >
      <Icon className="size-[17px] shrink-0 stroke-[2]" />
      {collapsed ? null : <span className="truncate">{item.label}</span>}
    </button>
  )
}

function readStoredSidebarState(
  storageKey: string,
  defaultSidebarOpen: boolean,
) {
  if (typeof window === 'undefined') return defaultSidebarOpen

  const stored = window.localStorage.getItem(storageKey)
  if (stored === 'open') return true
  if (stored === 'closed') return false
  return defaultSidebarOpen
}

export function AdminLayout({
  brand,
  children,
  className,
  defaultSidebarOpen = true,
  navigation,
  sidebarFooter,
  sidebarStorageKey = 'admin:sidebar:open',
}: AdminLayoutProps) {
  const { t: messages } = useTranslation()
  const pathname = useLocation({ select: (location) => location.pathname })
  const [sidebarOpen, setSidebarOpen] = React.useState(() =>
    readStoredSidebarState(sidebarStorageKey, defaultSidebarOpen),
  )

  React.useLayoutEffect(() => {
    const documentElement = document.documentElement
    documentElement.classList.add('cyacle-admin-theme')

    return () => {
      documentElement.classList.remove('cyacle-admin-theme')
    }
  }, [])

  const handleToggleSidebar = React.useCallback(() => {
    setSidebarOpen((current) => {
      const next = !current
      window.localStorage.setItem(sidebarStorageKey, next ? 'open' : 'closed')
      return next
    })
  }, [sidebarStorageKey])

  return (
    <div
      data-slot="admin-layout"
      className={cn(
        'cyacle-admin-theme flex h-dvh min-h-0 w-full overflow-hidden bg-[#f5f7fa] text-[#151a23]',
        className,
      )}
    >
      <aside
        className={cn(
          'flex shrink-0 flex-col border-r border-[#dce2e9] bg-white shadow-[1px_0_0_rgba(17,24,39,0.01)] transition-[width] duration-200 ease-out',
          sidebarOpen ? 'w-[240px]' : 'w-14',
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center overflow-hidden border-b border-[#e2e7ed] bg-white',
            sidebarOpen
              ? 'px-5'
              : 'justify-center px-0 [&_[data-slot=admin-brand-label]]:hidden',
          )}
        >
          <div className="w-max shrink-0">{brand}</div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-5 [scrollbar-color:#aab2bd_transparent] [scrollbar-width:thin]">
          <div className="space-y-6">
            {navigation.map((group) => (
              <section key={group.id}>
                {sidebarOpen ? (
                  <h2 className="mb-1 px-2 text-xs font-semibold tracking-[0.055em] text-[#7a8492]">
                    {group.title}
                  </h2>
                ) : null}
                <div className="space-y-px">
                  {group.items.map((item) => (
                    <AdminNavigationLink
                      key={item.id}
                      collapsed={!sidebarOpen}
                      item={item}
                      pathname={pathname}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </nav>

        {sidebarFooter ? (
          <div
            className={cn(
              'flex h-[52px] shrink-0 items-center overflow-hidden border-t border-[#e4e8ed] bg-white',
              sidebarOpen
                ? 'px-2'
                : 'justify-center px-2 [&_[data-slot=account-trigger]]:w-9 [&_[data-slot=account-trigger]]:px-1.5 [&_[data-slot=account-trigger-indicator]]:hidden [&_[data-slot=account-trigger-label]]:hidden [&_[data-slot=account-trigger-loading]]:size-6',
            )}
          >
            <div className="min-w-0 w-full">{sidebarFooter}</div>
          </div>
        ) : null}

        <button
          type="button"
          aria-label={
            sidebarOpen
              ? messages.common.admin.collapseNavigation
              : messages.common.admin.expandNavigation
          }
          className={cn(
            'flex h-10 shrink-0 items-center border-t border-[#e4e8ed] text-[#7a8492] transition-colors hover:bg-[#f4f7fa] hover:text-[#256fc4]',
            sidebarOpen ? 'justify-end px-3.5' : 'justify-center px-0',
          )}
          onClick={handleToggleSidebar}
        >
          {sidebarOpen ? (
            <ChevronLeft className="size-[18px]" />
          ) : (
            <ChevronRight className="size-[18px]" />
          )}
        </button>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-hidden bg-white">
        <React.Suspense fallback={<AdminContentPending />}>
          {children ?? <Outlet />}
        </React.Suspense>
      </main>
    </div>
  )
}
