import * as React from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button, ModuleLayout } from '@carbonnt-cyacle/web-base'

import { useTranslation } from '#/lib/i18n/index.ts'

export function AppRouteErrorPage({
  error,
  reset,
}: ErrorComponentProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const { t } = useTranslation()

  const handleRetry = React.useCallback(() => {
    reset()
    void router.invalidate()
  }, [reset, router])

  const handleGoBack = React.useCallback(() => {
    if (router.history.canGoBack()) {
      router.history.back()
      return
    }

    void navigate({ to: '/' })
  }, [navigate, router])

  const errorMessage = error instanceof Error ? error.message : undefined

  return (
    <ModuleLayout className='relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-6 py-12'>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute -top-32 -right-24 size-80 rounded-full bg-destructive/5 blur-3xl'
      />
      <main className='relative mx-auto w-full max-w-xl'>
        <div className='mb-8 flex items-center gap-3 text-destructive'>
          <span className='flex size-9 items-center justify-center rounded-xl bg-destructive/10'>
            <AlertTriangle aria-hidden='true' className='size-5' />
          </span>
          <span className='text-xs font-semibold tracking-[0.18em] uppercase'>
            {t.routeError.eyebrow}
          </span>
        </div>

        <h1 className='max-w-lg text-3xl leading-tight font-semibold tracking-tight text-foreground sm:text-4xl'>
          {t.routeError.title}
        </h1>
        <p className='mt-4 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base'>
          {t.routeError.description}
        </p>

        <div className='mt-8 flex flex-wrap gap-3'>
          <Button type='button' onClick={handleRetry}>
            <RefreshCw aria-hidden='true' />
            {t.routeError.retry}
          </Button>
          <Button type='button' variant='outline' onClick={handleGoBack}>
            <ArrowLeft aria-hidden='true' />
            {t.routeError.goBack}
          </Button>
        </div>

        {import.meta.env.DEV && errorMessage ? (
          <details className='mt-10 max-w-xl rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-muted-foreground'>
            <summary className='cursor-pointer font-medium text-foreground'>
              {t.routeError.debugDetails}
            </summary>
            <pre className='mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words'>
              {errorMessage}
            </pre>
          </details>
        ) : null}
      </main>
    </ModuleLayout>
  )
}

export function reportRouteError(error: Error, errorInfo: React.ErrorInfo) {
  console.error('[RouterErrorBoundary]', error, errorInfo)
}
