import * as React from 'react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
  headerActions?: React.ReactNode
  navigation: Array<AdminNavigationGroup>
  sidebarStorageKey?: string
}

interface AdminNavigationLinkProps {
  collapsed: boolean
  item: AdminNavigationItem
  pathname: string
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
  headerActions,
  navigation,
  sidebarStorageKey = 'admin:sidebar:open',
}: AdminLayoutProps) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const [sidebarOpen, setSidebarOpen] = React.useState(() =>
    readStoredSidebarState(sidebarStorageKey, defaultSidebarOpen),
  )

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
        'flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-[#f5f7fa] text-[#151a23]',
        className,
      )}
    >
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#dce2e9] bg-white px-6 shadow-[0_1px_0_rgba(17,24,39,0.02)]">
        <div className="flex min-w-0 items-center">{brand}</div>
        {headerActions ? (
          <div className="flex items-center gap-2">{headerActions}</div>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            'flex shrink-0 flex-col border-r border-[#dce2e9] bg-white transition-[width] duration-200 ease-out',
            sidebarOpen ? 'w-[296px]' : 'w-[68px]',
          )}
        >
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

          <button
            type="button"
            aria-label={sidebarOpen ? '收起后台导航' : '展开后台导航'}
            className="flex h-12 shrink-0 items-center justify-end border-t border-[#e4e8ed] px-4 text-[#69717d] transition-colors hover:bg-[#f4f7fa] hover:text-[#256fc4]"
            onClick={handleToggleSidebar}
          >
            {sidebarOpen ? (
              <ChevronLeft className="size-5" />
            ) : (
              <ChevronRight className="size-5" />
            )}
          </button>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden bg-white">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}
