import * as React from 'react'
import { ModuleLayout } from '@carbonnt-cyacle/web-base'
import { Button } from '@carbonnt-cyacle/web-base/components/ui/button'
import { useNavigate, useRouter } from '@tanstack/react-router'

import { useTranslation } from '#/lib/i18n/index.ts'

export function AppNotFoundPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const { t } = useTranslation()

  const handleGoBack = React.useCallback(() => {
    if (router.history.canGoBack()) {
      router.history.back()
      return
    }

    void navigate({ to: '/' })
  }, [navigate, router])

  const handleReturnHome = React.useCallback(() => {
    void navigate({ to: '/' })
  }, [navigate])

  return (
    <ModuleLayout className='flex min-h-svh items-center justify-center bg-background px-6 py-12'>
      <main className='mx-auto flex w-full max-w-md flex-col items-center text-center'>
        <div className='text-[6.5rem] leading-none font-black tracking-normal text-foreground sm:text-[7.25rem]'>
          404
        </div>
        <h1 className='mt-8 text-lg leading-6 font-semibold text-foreground'>
          {t.notFound.title}
        </h1>
        <p className='mt-4 max-w-72 text-sm leading-6 font-medium text-muted-foreground'>
          {t.notFound.description}
        </p>
        <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
          <Button type='button' variant='outline' onClick={handleGoBack}>
            {t.notFound.goBack}
          </Button>
          <Button type='button' onClick={handleReturnHome}>
            {t.notFound.returnHome}
          </Button>
        </div>
      </main>
    </ModuleLayout>
  )
}
