import * as React from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

import { Button } from '../../ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../ui/popover'
import { clearAuthSessionSideEffects } from '../../../lib/auth-session'
import { crossDomainRoutePaths } from '../../../lib/cross-domain-route-paths'
import { useTranslation } from '../../../lib/i18n'

import defaultUserAvatar from './assets/default-user-avatar.png'
import { MOCK_USER } from './nav-config'
import { useCurrentUserProfile } from './queries'

export function AccountPopover() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const profileQuery = useCurrentUserProfile()
  const profile = profileQuery.data
  const accountName =
    profile?.realName?.trim() ||
    profile?.nickname?.trim() ||
    profile?.username?.trim() ||
    MOCK_USER.name
  const accountContact =
    profile?.email?.trim() || profile?.phone?.trim() || MOCK_USER.email

  const handleLogoutClick = React.useCallback(() => {
    clearAuthSessionSideEffects()
    void navigate({ to: crossDomainRoutePaths.uic.login })
  }, [navigate])

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            aria-label={t.common.shell.account.menu}
            className="h-8 gap-2 px-2 active:translate-y-0"
          />
        }
      >
        <img
          src={defaultUserAvatar}
          alt=""
          aria-hidden="true"
          className="size-6 shrink-0 rounded-full border border-border object-cover"
        />
        <span className="max-w-28 truncate text-sm font-medium text-foreground">
          {accountName}
        </span>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-[280px] rounded-lg border border-border/70 p-0 shadow-xl"
      >
        <div className="p-2.5 pb-0">
          <div className="rounded-lg bg-muted px-3 py-2.5">
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
                <div className="mt-0.5 truncate text-xs leading-4 text-muted-foreground">
                  {accountContact}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2.5 border-t border-border/70 p-2.5">
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-full justify-start gap-2 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive active:translate-y-0"
            onClick={handleLogoutClick}
          >
            <LogOut aria-hidden="true" className="size-4" />
            <span>{t.common.shell.account.logout}</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
