import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider, type AnyRouter } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '@ab/web-kit/lib/http/supabase';
import { watchSystemTheme } from '@ab/web-kit/lib/theme';
import { bindWebPushToSession } from '@ab/web-kit/push/web-push-session';

interface App {
  router: AnyRouter;
  queryClient: QueryClient;
  /** The browser tab's title. */
  title: string;
}

/**
 * Each app's boot.tsx, once `t` holds the chosen language: the system theme followed, this
 * browser's push subscription bound to the session (dropped when it ends), the app on #root.
 */
export function renderApp({ router, queryClient, title }: App): void {
  watchSystemTheme();
  bindWebPushToSession(supabase.auth);
  document.title = title;
  const root = document.getElementById('root');
  if (!root) throw new Error('#root missing');
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
