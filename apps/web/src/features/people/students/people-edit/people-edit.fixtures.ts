import type { PeopleEditView } from '@ab/shared';

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
    has_records: false,
  },
  guardian: {
    id: 'g1',
    name: 'أم سهيلة',
    phone_e164: '+201000000001',
    country: 'EG',
    tz: 'Africa/Cairo',
    notes: null,
    has_login: false,
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
