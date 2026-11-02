import type { Permission, PeopleEditView } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient } from '@/test/query';

// Test data (not a test): one student with a family of two and a second number.

export const VIEW: PeopleEditView = {
  guardian: {
    has_login: false,
    id: 'g1',
    name: 'أم سهيلة',
    country: 'EG',
    notes: null,
    phone_e164: '+201000000001',
    phones: [
      { is_primary: true, phone_e164: '+201000000001' },
      { is_primary: false, phone_e164: '+201000000002' },
    ],
    students: [
      { code: 'AB-0183', contact_is_self: false, id: 's1', name: 'سهيلة' },
      { code: 'AB-0184', contact_is_self: false, id: 's2', name: 'أحمد' },
    ],
    tz: 'Africa/Cairo',
  },
  student: {
    age: 12,
    code: 'AB-0183',
    contact_is_self: false,
    gender: 'female',
    goal: null,
    has_login: false,
    has_records: false,
    id: 's1',
    level: null,
    memorized: null,
    name: 'سهيلة',
    notes: null,
    riwaya: null,
    teacher_gender_pref: null,
    tz: 'Africa/Cairo',
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
