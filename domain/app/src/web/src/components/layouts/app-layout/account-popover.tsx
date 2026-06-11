import * as React from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

import { Button } from '../../ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../ui/popover'
import { crossDomainRoutePaths } from '../../../lib/cross-domain-route-paths'

import defaultUserAvatar from './assets/default-user-avatar.png'
import { MOCK_USER } from './nav-config'

export function AccountPopover() {
  const navigate = useNavigate()

  const handleLogoutClick = React.useCallback(() => {
    void navigate({ to: crossDomainRoutePaths.uic.login })
  }, [navigate])

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            aria-label="账号菜单"
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
          {MOCK_USER.name}
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
                alt={MOCK_USER.name}
                className="size-11 shrink-0 rounded-full border border-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="min-w-0">
                  <div className="truncate text-[15px] leading-5 font-semibold text-foreground">
                    {MOCK_USER.name}
                  </div>
                </div>
                <div className="mt-0.5 truncate text-xs leading-4 text-muted-foreground">
                  {MOCK_USER.email}
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
            <span>退出登录</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
