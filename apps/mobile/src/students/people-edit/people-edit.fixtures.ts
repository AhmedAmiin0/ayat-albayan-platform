import type { Permission, PeopleEditView } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient } from '@/test/query';

// Test data (not a test): one student with a family of two and a second number.

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

export const PEOPLE_KEYS: Permission[] = [
  'people.edit',
  'students.attach_guardian',
  'people.switch_role',
];

/** A client whose /auth/me holds `permissions` only (a sales role). */
export function clientWith(permissions: Permission[]): QueryClient {
  const client = createTestQueryClient({ meFromApi: true });
  client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions });
  client.setQueryDefaults(pathKey('/auth/me'), { staleTime: Infinity });
  return client;
}
