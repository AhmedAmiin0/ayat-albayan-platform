import type { Permission, PeopleEditView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { Mock } from 'vitest';
import { meQuery, type Me } from '@/features/people/auth';
import { PeopleEditActions } from './PeopleEditActions';
import { VIEW } from './people-edit.fixtures';

export { VIEW };

// Test helper (not a test): one student with a family of two, and the actions as a role sees them.

export const ALL: Permission[] = ['people.edit', 'students.attach_guardian', 'people.switch_role'];

/** Student s1's actions for a login holding `permissions`; GET /people/students/s1 → `view`. */
export function renderActions(
  apiFetch: Mock,
  opts: {
    permissions: Permission[];
    view?: PeopleEditView;
    extra?: [string, unknown][];
    onRemoved?: (notice: string) => void;
  },
) {
  const routes: [string, unknown][] = [
    ['/people/students/s1', opts.view ?? VIEW],
    ...(opts.extra ?? []),
  ];
  apiFetch.mockImplementation(async (path: string) => {
    await Promise.resolve();
    const hit = routes.find(([prefix]) => path.startsWith(prefix));
    if (!hit) throw new Error(`unrouted ${path}`);
    return hit[1];
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  const me: Me = { id: 'u1', email: null, role: 'sales', permissions: opts.permissions };
  client.setQueryData(meQuery.queryKey, me);
  render(
    <QueryClientProvider client={client}>
      <PeopleEditActions studentId="s1" onRemoved={opts.onRemoved} />
    </QueryClientProvider>,
  );
  return client;
}
