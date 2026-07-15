import { RouterProvider } from '@tanstack/react-router';
import ReactDOM from 'react-dom/client';
import { BaseProviders } from '@carbonnt-cyacle/web-base';

import '#/vineStyles.gen.css';
import { router } from '#/router.ts';
import { StrictMode } from 'react';

const rootElement = document.getElementById('app')!;

if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <BaseProviders>
        <RouterProvider router={router} />
      </BaseProviders>
    </StrictMode>
  );
}
