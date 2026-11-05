import type { PeopleEditView } from '@ab/shared';

// Test data (not a test): one student, a family of one with its main number.

const student: PeopleEditView['student'] = {
  has_records: false,
  has_login: false,
  contact_is_self: false,
  teacher_gender_pref: null,
  notes: null,
  tz: 'Africa/Cairo',
  riwaya: null,
  goal: null,
  memorized: null,
  level: null,
  gender: 'female',
  age: 12,
  name: 'سهيلة',
  code: 'AB-0183',
  id: 's1',
};

export const VIEW: PeopleEditView = {
  student,
  guardian: {
    students: [{ contact_is_self: false, name: 'سهيلة', code: 'AB-0183', id: 's1' }],
    phones: [{ is_primary: true, phone_e164: '+201000000001' }],
    has_login: false,
    notes: null,
    tz: 'Africa/Cairo',
    country: 'EG',
    phone_e164: '+201000000001',
    name: 'أم سهيلة',
    id: 'g1',
  },
};
