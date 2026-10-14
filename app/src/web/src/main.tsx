import { RouterProvider } from '@tanstack/react-router';
import ReactDOM from 'react-dom/client';
import { BaseProviders } from '@carbonnt-cyacle/web-base';

import '#/generated/styles.gen.css';
import { applyAppEditionToDocument, getAppEdition } from '#/app-edition.ts';
import { router } from '#/router.ts';
import { StrictMode } from 'react';

const rootElement = document.getElementById('app')!;

applyAppEditionToDocument(getAppEdition());


if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <BaseProviders>
        <RouterProvider router={router} />
      </BaseProviders>
    </StrictMode>
  );
}
