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
        'group flex h-10 w-full items-center rounded-md text-left text-[15px] transition-colors duration-150',
        collapsed ? 'justify-center px-2' : 'gap-3 px-3',
        selected
          ? 'bg-[#256fc4] font-medium text-white shadow-[0_1px_2px_rgba(16,70,130,0.24)]'
          : 'text-[#202632] hover:bg-[#edf4fb] hover:text-[#165fae]',
        item.disabled &&
          'cursor-not-allowed text-[#9aa3af] opacity-60 hover:bg-transparent hover:text-[#9aa3af]',
      )}
      onClick={handleClick}
    >
      <Icon className="size-[19px] shrink-0 stroke-[2.1]" />
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
          'flex shrink-0 flex-col border-r border-[#dce2e9] bg-white transition-[width] duration-200 ease-out',
          sidebarOpen ? 'w-[296px]' : 'w-[68px]',
        )}
      >
        <div
          className={cn(
            'flex h-[72px] shrink-0 items-center overflow-hidden border-b border-[#dce2e9] bg-white shadow-[0_1px_0_rgba(17,24,39,0.02)]',
            sidebarOpen
              ? 'px-6'
              : 'justify-center px-0 [&_[data-slot=admin-brand-label]]:hidden',
          )}
        >
          <div className="w-max shrink-0">{brand}</div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-7 [scrollbar-color:#8f949b_transparent] [scrollbar-width:thin]">
          <div className="space-y-8">
            {navigation.map((group) => (
              <section key={group.id}>
                {sidebarOpen ? (
                  <h2 className="mb-1.5 px-1 text-[14px] font-medium tracking-[0.04em] text-[#69717d]">
                    {group.title}
                  </h2>
                ) : null}
                <div className="space-y-0.5">
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
              'flex h-14 shrink-0 items-center overflow-hidden border-t border-[#e4e8ed] bg-white',
              sidebarOpen
                ? 'px-2'
                : 'justify-center px-2 [&_[data-slot=account-trigger]]:w-10 [&_[data-slot=account-trigger]]:px-1.5 [&_[data-slot=account-trigger-indicator]]:hidden [&_[data-slot=account-trigger-label]]:hidden [&_[data-slot=account-trigger-loading]]:size-7',
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
            'flex h-12 shrink-0 items-center border-t border-[#e4e8ed] text-[#69717d] transition-colors hover:bg-[#f4f7fa] hover:text-[#256fc4]',
            sidebarOpen ? 'justify-end px-4' : 'justify-center px-0',
          )}
          onClick={handleToggleSidebar}
        >
          {sidebarOpen ? (
            <ChevronLeft className="size-5" />
          ) : (
            <ChevronRight className="size-5" />
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
