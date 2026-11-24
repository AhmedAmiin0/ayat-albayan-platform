import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider, type AnyRouter } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MaintenanceGate, type MaintenanceOptions } from '@ab/web-kit/boot/maintenance';
import { supabase } from '@ab/web-kit/lib/http/supabase';
import { watchSystemTheme } from '@ab/web-kit/lib/theme';
import { bindWebPushToSession } from '@ab/web-kit/push/web-push-session';
import { reportWebError } from './web-errors';

interface App {
  router: AnyRouter;
  queryClient: QueryClient;
  /** The browser tab's title. */
  title: string;
  /** The staff app's rooms and sign-in are covered; the family app none. */
  maintenance?: MaintenanceOptions;
}

/**
 * Each app's boot.tsx, once `t` holds the chosen language: the system theme followed, this
 * browser's push subscription bound to the session (dropped when it ends), the app on #root
 * under the maintenance cover.
 */
export function renderApp({ router, queryClient, title, maintenance = {} }: App): void {
  watchSystemTheme();
  bindWebPushToSession(supabase.auth);
  document.title = title;
  const root = document.getElementById('root');
  if (!root) throw new Error('#root missing');
  // A render error a route's error card caught, or one nothing caught, still reaches the tracker.
  const onError = (error: unknown): void => reportWebError(error);
  createRoot(root, { onCaughtError: onError, onUncaughtError: onError }).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MaintenanceGate router={router} {...maintenance}>
          <RouterProvider router={router} />
        </MaintenanceGate>
      </QueryClientProvider>
    </StrictMode>,
  );
}
