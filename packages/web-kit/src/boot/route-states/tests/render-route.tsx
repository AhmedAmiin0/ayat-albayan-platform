import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

/** `ui` at the root route and a «/home» page, under a memory router at `path`. */
export function renderRoute(ui: ReactElement, path = '/') {
  const rootRoute = createRootRoute({ component: () => ui });
  const home = createRoute({ getParentRoute: () => rootRoute, path: '/home' });
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createRouter({ routeTree: rootRoute.addChildren([home]), history });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router };
}
