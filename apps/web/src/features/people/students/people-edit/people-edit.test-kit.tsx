import type { Permission, PeopleEditView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { Mock } from 'vitest';
import { meQuery, type Me } from '@/features/people/auth';
import { PeopleEditActions } from './PeopleEditActions';

// Test helper (not a test): one student with a family of two, and the actions as a role sees them.

export const VIEW: PeopleEditView = {
  student: {
    id: 's1',
    code: 'AB-0183',
    name: 'سهيلة',
    age: 12,
    gender: 'female',
    level: null,
    memorized: null,
    goal: null,
    riwaya: null,
    tz: 'Africa/Cairo',
    notes: null,
    teacher_gender_pref: null,
    contact_is_self: false,
    has_login: false,
  },
  guardian: {
    id: 'g1',
    name: 'أم سهيلة',
    phone_e164: '+201000000001',
    country: 'EG',
    tz: 'Africa/Cairo',
    notes: null,
    phones: [
      { phone_e164: '+201000000001', is_primary: true },
      { phone_e164: '+201000000002', is_primary: false },
    ],
    students: [
      { id: 's1', code: 'AB-0183', name: 'سهيلة', contact_is_self: false },
      { id: 's2', code: 'AB-0184', name: 'أحمد', contact_is_self: false },
    ],
  },
};

export const ALL: Permission[] = ['people.edit', 'students.attach_guardian', 'people.switch_role'];

/** Student s1's actions for a login holding `permissions`; GET /people/students/s1 → `view`. */
export function renderActions(
  apiFetch: Mock,
  opts: { permissions: Permission[]; view?: PeopleEditView; extra?: [string, unknown][] },
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
      <PeopleEditActions studentId="s1" />
    </QueryClientProvider>,
  );
  return client;
}
