import * as React from 'react'
import { NotFoundError } from '@carbonnt-cyacle/web-base'
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
    <NotFoundError
      description={t.notFound.description}
      goBackLabel={t.notFound.goBack}
      onGoBack={handleGoBack}
      onReturnHome={handleReturnHome}
      returnHomeLabel={t.notFound.returnHome}
      title={t.notFound.title}
    />
  )
}
