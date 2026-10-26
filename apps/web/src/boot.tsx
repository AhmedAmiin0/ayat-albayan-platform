import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bindWebPushToSession } from './features/messaging/notifications/web-push/web-push-session';
import { t } from './lib/i18n/i18n';
import { supabase } from './lib/http/supabase';
import { watchSystemTheme } from './lib/theme';
import { routeTree } from './routeTree.gen';

// Loaded by main.tsx once the translation overrides are in `t`: every screen module evaluates here.

const queryClient = new QueryClient();
const router = createRouter({ routeTree, context: { queryClient } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

watchSystemTheme();
bindWebPushToSession(supabase.auth);
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
