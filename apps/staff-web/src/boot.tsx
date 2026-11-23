import { createRouter } from '@tanstack/react-router';
import { renderApp } from '@ab/web-kit/boot/render-app';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { rememberUntilSessionEnd } from '@/features/messaging/inbox';
import { createQueryClient, ROUTER_DEFAULTS } from '@/lib/query';
import { routeTree } from './routeTree.gen';

// Loaded by main.tsx once the translation overrides are in `t`: every screen module evaluates here.

const queryClient = createQueryClient();
const router = createRouter({ routeTree, context: { queryClient }, ...ROUTER_DEFAULTS });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// The inbox's unsent replies and drafts go when the session ends (sign-out, another tab).
rememberUntilSessionEnd();
// «تحت الصيانة» (owner 2026-11-21): a lesson room is never covered; the sign-in stays open so an
// admin can get in while the switch is on.
const maintenance = {
  staff: true,
  rooms: /^\/(classroom|meeting|join|s|m)\//,
  signIn: /^\/(login|set-password)\/?$/,
};
renderApp({ router, queryClient, title: t.app.name, maintenance });
