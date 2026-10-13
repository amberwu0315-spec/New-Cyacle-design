import { RouterProvider } from '@tanstack/react-router';
import ReactDOM from 'react-dom/client';
import { BaseProviders } from '@carbonnt-cyacle/web-base';
import { registerDataRecordDocumentPreview } from '@carbonnt-cyacle/web-record/pub';

import '#/generated/styles.gen.css';
import { applyAppEditionToDocument, getAppEdition } from '#/app-edition.ts';
import { router } from '#/router.ts';
import { StrictMode } from 'react';

const rootElement = document.getElementById('app')!;

applyAppEditionToDocument(getAppEdition());

// 跨域组合：文档预览里的「新增记录 / 记录列表」由 record 域提供、app 负责装配。
registerDataRecordDocumentPreview();

if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <BaseProviders>
        <RouterProvider router={router} />
      </BaseProviders>
    </StrictMode>
  );
}
