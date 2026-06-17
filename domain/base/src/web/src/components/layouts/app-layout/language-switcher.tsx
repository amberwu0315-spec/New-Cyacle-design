import * as React from 'react'
import { CheckIcon, ChevronUpIcon, GlobeIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import {
  formatMessage,
  languageStore,
  useTranslation,
} from '#/lib/i18n/index.ts'
import type { SupportedLanguage } from '#/lib/i18n/index.ts'
import { cn } from '#/lib/utils.ts'

const LANGUAGE_SWITCHER_OPTIONS: Array<SupportedLanguage> = ['en-US', 'zh-CN']

const LANGUAGE_SHORT_LABELS: Record<SupportedLanguage, string> = {
  'en-US': 'EN',
  'zh-CN': '中',
}

const LANGUAGE_MENU_LABELS: Record<SupportedLanguage, string> = {
  'en-US': 'English',
  'zh-CN': '简体中文',
}

export function LanguageSwitcher() {
  const { language, t } = useTranslation()

  const getLanguageName = (value: SupportedLanguage) =>
    value === 'zh-CN'
      ? t.common.language.names['zh-CN']
      : t.common.language.names['en-US']

  const label = formatMessage(t.common.language.current, {
    language: getLanguageName(language),
  })

  const handleLanguageChange = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const nextLanguage = event.currentTarget.dataset
        .language as SupportedLanguage
      languageStore.setLanguage(nextLanguage)
    },
    [],
  )

  return (
    <div
      role="group"
      aria-label={label}
      className="flex shrink-0 items-center gap-1 rounded-[8px] border border-border bg-background p-0.5 shadow-xs"
    >
      {LANGUAGE_SWITCHER_OPTIONS.map((item) => {
        const isActive = item === language

        return (
          <button
            key={item}
            type="button"
            data-language={item}
            aria-pressed={isActive}
            aria-label={getLanguageName(item)}
            className={cn(
              'flex h-6 min-w-6 items-center justify-center rounded-[6px] px-1 text-xs leading-4 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              isActive
                ? 'bg-primary font-bold text-primary-foreground shadow-xs hover:bg-primary/90'
                : 'font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )}
            onClick={handleLanguageChange}
          >
            {LANGUAGE_SHORT_LABELS[item]}
          </button>
        )
      })}
    </div>
  )
}

// 当前给登录页面 footer 使用的语言菜单，避免影响工作台顶部的紧凑切换组件。
export function LanguageMenu() {
  const { language, t } = useTranslation()
  const label = formatMessage(t.common.language.current, {
    language: LANGUAGE_MENU_LABELS[language],
  })

  const handleLanguageChange = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const nextLanguage = event.currentTarget.dataset
        .language as SupportedLanguage
      languageStore.setLanguage(nextLanguage)
    },
    [],
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="secondary"
            size="xs"
            aria-label={label}
            className="h-6 gap-1 rounded-full px-2.5 active:translate-y-0"
          />
        }
      >
        <GlobeIcon data-icon="inline-start" aria-hidden="true" />
        <span>{LANGUAGE_MENU_LABELS[language]}</span>
        <ChevronUpIcon data-icon="inline-end" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-40 rounded-lg border border-border/70 p-1 shadow-none"
      >
        <DropdownMenuGroup>
          {LANGUAGE_SWITCHER_OPTIONS.map((item) => {
            const isActive = item === language

            return (
              <DropdownMenuItem
                key={item}
                data-language={item}
                aria-current={isActive ? 'true' : undefined}
                className="h-8 cursor-pointer px-2 text-sm"
                onClick={handleLanguageChange}
              >
                <span className="min-w-0 flex-1 truncate">
                  {LANGUAGE_MENU_LABELS[item]}
                </span>
                {isActive ? <CheckIcon aria-hidden="true" /> : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
