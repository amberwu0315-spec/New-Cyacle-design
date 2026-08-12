import type { PropsWithChildren } from 'react'
import { FileViewerConfig } from '@cew-lib/file-viewer-base'
import { CrewUiConfig } from '@crew-ui/base'

import { Toaster } from '#/components/ui/toast.tsx'
import { TooltipProvider } from '#/components/ui/tooltip.tsx'
import { DocumentPreviewHost } from '#/components/common/document-preview/index.ts'
import { TanstackQueryRootProvider } from '#/context/query-client.tsx'
import { useLanguageStore } from '#/lib/i18n/index.ts'

export function BaseProviders({ children }: PropsWithChildren) {
  const language = useLanguageStore()

  return (
    <TanstackQueryRootProvider>
      <TooltipProvider>
        <FileViewerConfig locale={language} />
        <CrewUiConfig locale={language === 'en-US' ? 'en' : 'zh'} />
        {children}
        <DocumentPreviewHost />
        <Toaster position='top-center' />
      </TooltipProvider>
    </TanstackQueryRootProvider>
  )
}
