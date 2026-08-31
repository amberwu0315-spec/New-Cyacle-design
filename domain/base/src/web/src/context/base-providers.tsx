import { useEffect, type PropsWithChildren } from 'react'
import { FileViewerConfig } from '@cew-lib/file-viewer-base'
import { CrewUiConfig } from '@crew-ui/base'

import { Toaster } from '#/components/ui/toast.tsx'
import { TooltipProvider } from '#/components/ui/tooltip.tsx'
import { DataSelectorDetailDrawerStackHost } from '#/components/common/data-selector-detail-drawer.tsx'
import { DocumentPreviewHost } from '#/components/common/document-preview/index.ts'
import { TanstackQueryRootProvider } from '#/context/query-client.tsx'
import { getMessages, useLanguageStore } from '#/lib/i18n/index.ts'

export function BaseProviders({ children }: PropsWithChildren) {
  const language = useLanguageStore()

  useEffect(() => {
    document.title = getMessages(language).common.shell.sidebar.brandName
  }, [language])

  return (
    <TanstackQueryRootProvider>
      <TooltipProvider>
        <FileViewerConfig locale={language} />
        <CrewUiConfig locale={language === 'en-US' ? 'en' : 'zh'} />
        {children}
        <DataSelectorDetailDrawerStackHost />
        <DocumentPreviewHost />
        <Toaster position='top-center' />
      </TooltipProvider>
    </TanstackQueryRootProvider>
  )
}
