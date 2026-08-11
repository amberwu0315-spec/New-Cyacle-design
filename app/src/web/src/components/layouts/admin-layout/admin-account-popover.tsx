import {
  ChevronsUpDownIcon,
  ExternalLinkIcon,
  LogOutIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from 'lucide-react'

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
  type AppLayoutAsyncState,
  type AppLayoutUserProfile,
} from '@carbonnt-cyacle/web-base'

import { useTranslation } from '#/lib/i18n/index.ts'

export interface AdminAccountPopoverProps {
  hasSessionCredential: boolean
  onLogout: () => void
  profileQuery: AppLayoutAsyncState<AppLayoutUserProfile>
  showFrontendLink: boolean
}

export function AdminAccountPopover({
  hasSessionCredential,
  onLogout,
  profileQuery,
  showFrontendLink,
}: AdminAccountPopoverProps) {
  const { t } = useTranslation()
  const profile = profileQuery.data
  const isProfileLoading =
    hasSessionCredential &&
    !profile &&
    (Boolean(profileQuery.isLoading) || profileQuery.isFetching)
  const accountName =
    profile?.realName?.trim() ||
    profile?.username?.trim() ||
    t.layout.admin.account.fallbackName
  const accountIdentity = profile?.email?.trim() || profile?.phone?.trim()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            data-slot="account-trigger"
            variant="ghost"
            aria-label={t.layout.admin.account.menu}
            className="group h-10 w-full min-w-0 max-w-none justify-start gap-3 rounded-md px-3 text-[#202632] transition-colors duration-150 hover:bg-[#edf4fb] hover:text-[#165fae] data-popup-open:bg-[#e7f1fb] data-popup-open:text-[#165fae] active:translate-y-0"
          />
        }
      >
        {isProfileLoading ? (
          <Skeleton
            data-slot="account-trigger-loading"
            aria-hidden="true"
            className="h-9 w-28 rounded-md"
          />
        ) : (
          <>
            <span className="grid size-7 shrink-0 place-items-center rounded-[5px] bg-[#e7f1fb] text-[#1766b3] ring-1 ring-[#c8def2] transition-colors group-hover:bg-white group-data-popup-open:bg-white">
              <UserRoundIcon aria-hidden="true" className="size-[17px]" />
            </span>
            <span
              data-slot="account-trigger-label"
              className="min-w-0 truncate text-sm font-medium"
            >
              {accountName}
            </span>
            <ChevronsUpDownIcon
              data-slot="account-trigger-indicator"
              aria-hidden="true"
              className="ml-auto size-3.5 shrink-0 text-[#8a94a2] transition-colors group-hover:text-[#4f647c]"
            />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={10}
        className="w-[276px] rounded-md border border-[#dce2e9] p-0 shadow-[0_12px_32px_rgba(28,48,74,0.18)]"
      >
        <div className="border-b border-[#e4e8ed] bg-[#f7f9fb] px-4 py-3.5">
          {isProfileLoading ? (
            <div aria-hidden="true" className="flex items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#1766b3] text-white shadow-[0_2px_5px_rgba(23,102,179,0.22)]">
                <UserRoundIcon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold text-[#202632]">
                  {accountName}
                </div>
                {accountIdentity ? (
                  <div className="mt-0.5 truncate text-xs text-[#69717d]">
                    {accountIdentity}
                  </div>
                ) : null}
              </div>
            </div>
          )}
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-[#e7f1fb] px-2 py-1 text-xs font-medium text-[#1766b3]">
            <ShieldCheckIcon aria-hidden="true" className="size-3.5" />
            {t.layout.admin.account.contextLabel}
          </div>
        </div>

        <div className="p-2">
          {showFrontendLink ? (
            <DropdownMenuItem
              render={<a href="/" target="_blank" rel="noopener noreferrer" />}
              className="h-10 cursor-pointer gap-2.5 rounded-md px-2.5 text-sm font-medium text-[#202632] focus:bg-[#edf4fb] focus:text-[#165fae]"
            >
              <ExternalLinkIcon
                aria-hidden="true"
                className="size-4 text-[#69717d]"
              />
              <span>{t.layout.admin.account.openFrontend}</span>
            </DropdownMenuItem>
          ) : null}

          {showFrontendLink ? (
            <DropdownMenuSeparator className="mx-0 my-1.5" />
          ) : null}

          <DropdownMenuItem
            variant="destructive"
            className="h-10 cursor-pointer gap-2.5 rounded-md px-2.5 text-sm font-medium"
            onClick={onLogout}
          >
            <LogOutIcon aria-hidden="true" className="size-4" />
            <span>{t.layout.admin.account.logout}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
