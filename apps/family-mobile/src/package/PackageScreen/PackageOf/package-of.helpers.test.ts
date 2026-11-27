import { student } from '@/portal/portal.fixtures';
import { seesPackage } from './package-of.helpers';

const home = (kind: 'guardian' | 'student') => ({ kind, students: [], renew_url: null });

test('a guardian sees the package; a child login does not', () => {
  expect(seesPackage(home('guardian'), student())).toBe(true);
  expect(seesPackage(home('student'), student())).toBe(false);
});

test('an adult who is their own contact sees it whichever way they signed in', () => {
  expect(seesPackage(home('student'), student({ contact_is_self: true }))).toBe(true);
});
