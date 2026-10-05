// The owner's staging test account (2026-10-05: "create a test teacher and assign it to a test
// student"): one teacher login, one guardian, one student. Same DEMO markers as seed-demo.data.mjs
// (teacher English name ends in " (DEMO)", guardian/student notes = DEMO_NOTE), so `pnpm clear:demo`
// also removes these rows. Phones are fake (+1 555 …) and fixed so re-runs upsert.
import { DEMO_NOTE } from './seed-demo.data.mjs';

/** Stamped on the auth user's metadata; --remove and re-runs never touch a login without it. */
export const TEST_ACCOUNT_MARKER = 'seed-test-account';

export const TEST_TEACHER = {
  ar: 'معلم تجريبي',
  en: 'Test Teacher (DEMO)',
  gender: 'male',
  programs: ['quran'],
  phone: '+15550001001',
  tz: 'Asia/Riyadh',
  status: 'active',
  max: 10,
  rates: { rate_30: 60, rate_45: 85, rate_60: 110, rate_90: 160 },
  /** [weekday 0=الأحد … 6=السبت, start, end] in the teacher's tz: Sun–Thu 16:00–22:00. */
  availability: [0, 1, 2, 3, 4].map((d) => [d, '16:00', '22:00']),
};

export const TEST_FAMILY = {
  name: 'ولي أمر تجريبي',
  phone: '+15550001002',
  country: 'SA',
  tz: 'Asia/Riyadh',
  source: 'other',
  note: DEMO_NOTE,
  student: { name: 'طالب تجريبي', age: 10, gender: 'male', program: 'quran', status: 'active' },
};
