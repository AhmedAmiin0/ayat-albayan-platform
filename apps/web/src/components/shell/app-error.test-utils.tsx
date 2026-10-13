import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { Route as root } from '@/routes/__root';

// Test-only: the real root route (with its errorComponent) over two stand-in sections, so specs
// see what a failing section beforeLoad really renders. Starts on /admin.

export const PAGE_TEXT = 'section page';
export const LOGIN_TEXT = 'login page';

const cancel = (event: ErrorEvent) => event.preventDefault();

/**
 * The failure is the point of these specs: keeps React's caught-error report, the router's warnings
 * and jsdom's missing scrollTo out of the test output. Call in beforeEach.
 */
export function quietExpectedErrors(): void {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  window.removeEventListener('error', cancel);
  window.addEventListener('error', cancel);
}

export function renderFailingSection(beforeLoad: () => Promise<void>) {
  const section = createRoute({ getParentRoute: () => root, path: '/admin', beforeLoad, component: () => PAGE_TEXT });
  const login = createRoute({ getParentRoute: () => root, path: '/login', component: () => LOGIN_TEXT });
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree: root.addChildren([section, login]),
    history: createMemoryHistory({ initialEntries: ['/admin'] }),
    context: { queryClient },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, queryClient };
}
