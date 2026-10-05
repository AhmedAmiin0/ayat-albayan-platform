import { localeDir } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts (no Google Fonts at runtime): Noto Sans Arabic for all UI text and titles
// (owner, 2026-10-05: an easier font to read; the PDF report keeps its own faces).
import '@fontsource/noto-sans-arabic/400.css';
import '@fontsource/noto-sans-arabic/500.css';
import '@fontsource/noto-sans-arabic/600.css';
import '@fontsource/noto-sans-arabic/700.css';
import './index.css';
import { t } from './lib/i18n';
import { locale } from './lib/locale';
import { watchSystemTheme } from './lib/theme';
import { routeTree } from './routeTree.gen';

const queryClient = new QueryClient();
const router = createRouter({ routeTree, context: { queryClient } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

watchSystemTheme();

// index.html paints Arabic RTL; an English choice flips <html> before React renders anything.
document.documentElement.lang = locale;
document.documentElement.dir = localeDir(locale);
document.title = t.app.name;

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
