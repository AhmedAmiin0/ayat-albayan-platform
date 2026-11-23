import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { renderApp } from '@ab/web-kit/boot/render-app';
import { routeStates } from '@ab/web-kit/boot/route-states';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { routeTree } from './routeTree.gen';

// Loaded by main.tsx once `t` holds the chosen language. Reads stay fresh for 30 s: the family
// moves between the tabs often, the portal's own queries poll what has to be live.
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  ...routeStates({ words: t.familyWeb.routeError, home: '/portal' }),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

renderApp({ router, queryClient, title: t.familyApp.signIn.wordmark });
