import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { routeTree } from '@/routeTree.gen';

// Google Play opens both pages from the listing and the Data safety form: no sign-in, no shell.
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

afterEach(() => {
  apiFetch.mockReset();
});

const open = (path: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createRouter({ routeTree, history, context: { queryClient } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
};

it.each([
  ['/privacy', t.legal.privacy.title],
  ['/delete-account', t.legal.deletion.title],
])('%s opens signed out: no redirect to /login, only the public settings read', async (path, title) => {
  apiFetch.mockResolvedValue({});
  const router = open(path);
  expect(await screen.findByRole('heading', { level: 1, name: title })).toBeTruthy();
  expect(router.state.location.pathname).toBe(path);
  expect(apiFetch.mock.calls.map((call) => String(call[0]))).toEqual(['/settings/public']);
});
