import * as React from 'react'

import {
  formatMessage,
  languageStore,
  useTranslation,
} from '../../../lib/i18n'
import type { SupportedLanguage } from '../../../lib/i18n'
import { cn } from '../../../lib/utils'

const LANGUAGE_SWITCHER_OPTIONS: Array<SupportedLanguage> = ['en-US', 'zh-CN']

const LANGUAGE_SHORT_LABELS: Record<SupportedLanguage, string> = {
  'en-US': 'EN',
  'zh-CN': '中',
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
