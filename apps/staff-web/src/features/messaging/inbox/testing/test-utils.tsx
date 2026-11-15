import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import type { Mock } from 'vitest';

// Shared by the inbox / settings component tests (not app code).

/** `@tanstack/react-router` Link as a plain <a> with the search in the href. */
export function MockLink({ to, search, children, ...rest }: { to: string; search?: object; children: ReactNode }) {
  const params = new URLSearchParams(Object.entries(search ?? {}).map(([k, v]) => [k, String(v)]));
  return (
    <a href={`${to}?${params}`} {...rest}>
      {children}
    </a>
  );
}

/** apiFetch answers by path prefix (first match wins); an unrouted path fails the query. */
export function routeFetch(apiFetch: Mock, routes: readonly (readonly [string, unknown])[]) {
  apiFetch.mockImplementation(async (path: string) => {
    const hit = routes.find(([prefix]) => path.startsWith(prefix));
    if (!hit) throw new Error(`unrouted ${path}`);
    return hit[1];
  });
}

export function renderWithClient(ui: ReactElement): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return client;
}
