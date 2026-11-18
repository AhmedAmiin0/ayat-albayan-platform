import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { renderApp } from '@ab/web-kit/boot/render-app';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { rememberUntilSessionEnd } from './features/messaging/inbox';
import { routeTree } from './routeTree.gen';

// Loaded by main.tsx once the translation overrides are in `t`: every screen module evaluates here.

const queryClient = new QueryClient();
const router = createRouter({ routeTree, context: { queryClient } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// The inbox's unsent replies and drafts go when the session ends (sign-out, another tab).
rememberUntilSessionEnd();
renderApp({ router, queryClient, title: t.app.name });
