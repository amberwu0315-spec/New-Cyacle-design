'use client'

import * as React from 'react'
import { renderToString } from 'katex'

import { cn } from '#/lib/utils.ts'

export interface KatexFormulaProps {
  math: string
  displayMode?: boolean
  className?: string
  fallbackClassName?: string
}

function renderKatex(math: string, displayMode: boolean) {
  try {
    return renderToString(math, {
      displayMode,
      output: 'html',
      strict: false,
      throwOnError: true,
    })
  } catch {
    return null
  }
}

export function KatexFormula({
  math,
  displayMode = false,
  className,
  fallbackClassName,
}: KatexFormulaProps) {
  const trimmedMath = math.trim()
  const html = React.useMemo(
    () => (trimmedMath ? renderKatex(trimmedMath, displayMode) : null),
    [displayMode, trimmedMath],
  )

  if (!html) {
    const FallbackTag = displayMode ? 'div' : 'span'

    return (
      <FallbackTag
        className={cn(
          displayMode
            ? 'whitespace-pre-wrap break-all text-sm text-foreground'
            : 'text-sm text-foreground',
          fallbackClassName,
          className,
        )}
      >
        {math}
      </FallbackTag>
    )
  }

  const FormulaTag = displayMode ? 'div' : 'span'

  return (
    <FormulaTag
      data-testid="katex-formula"
      className={cn(
        'block max-w-full overflow-x-auto overflow-y-hidden py-0.5 text-sm text-foreground [&_.katex]:text-current',
        displayMode ? 'w-full' : 'min-w-0',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
