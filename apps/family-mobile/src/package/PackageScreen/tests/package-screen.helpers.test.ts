import { t } from '@ab/mobile-kit';
import { student } from '@/portal/portal.fixtures';
import { packageTitle } from '@/package/PackageScreen/package-screen.helpers';

const kid = student();
const home = (kind: 'guardian' | 'student') => ({ kind, students: [kid], renew_url: null });

test('a guardian: the package heading with the child name', () => {
  expect(packageTitle(home('guardian'), kid.id)).toBe(`${t.portal.packageTab} · ${kid.name}`);
});

test('a child login: the name alone, no package heading', () => {
  expect(packageTitle(home('student'), kid.id)).toBe(kid.name);
});

test('no profile yet or an unknown student: an empty heading', () => {
  expect(packageTitle(undefined, kid.id)).toBe('');
  expect(packageTitle(home('guardian'), 'someone-else')).toBe('');
});
