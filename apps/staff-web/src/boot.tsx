import { createRouter } from '@tanstack/react-router';
import { returnSearchOf, signOut, renderApp, notFoundState, routeStates, t } from '@ab/web-kit';
import { rememberUntilSessionEnd } from '@/features/messaging/inbox';
import { createQueryClient, queryErrorHandler, ROUTER_DEFAULTS } from '@/lib/query';
import { routeTree } from './routeTree.gen';

// Loaded by main.tsx once the translation overrides are in `t`: every screen module evaluates here.

// After signing in again the person lands back on the page the ended session was showing.
async function leave(): Promise<void> {
  const back = router.state.location.href;
  await signOut(queryClient);
  await router.navigate({ to: '/login', search: returnSearchOf(back) });
}

const queryClient = createQueryClient(queryErrorHandler(leave));
const router = createRouter({
  routeTree,
  context: { queryClient },
  ...ROUTER_DEFAULTS,
  ...routeStates({ words: t.app.routeError, home: '/' }),
  ...notFoundState({ words: t.app.notFound, home: '/' }),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// The inbox's unsent replies and drafts go when the session ends (sign-out, another tab).
rememberUntilSessionEnd();
// Maintenance never covers a lesson room, and sign-in stays open so an admin can get in.
const maintenance = {
  staff: true,
  rooms: /^\/(classroom|meeting|join|s|m)\//,
  signIn: /^\/(login|set-password)\/?$/,
};
renderApp({ router, queryClient, title: t.app.name, maintenance });
