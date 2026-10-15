import { STUDENT_STATUSES } from '@ab/shared';
import { subscription } from '@/payments/fixtures';
import { renewHref } from './renew';

test('only a package-ended student (pending_renewal, expired) can renew', () => {
  const shown = STUDENT_STATUSES.filter((status) => renewHref({ id: 's1', status }, null) !== null);
  expect(shown).toEqual(['pending_renewal', 'expired']);
});

test('prefilled from the last package: its size and lesson length, titled as a renewal', () => {
  const last = subscription({ package: '8', duration: 60 });
  expect(renewHref({ id: 's1', status: 'expired' }, last)).toEqual({
    pathname: '/students/subscribe',
    params: { studentId: 's1', renew: '1', pkg: '8', minutes: '60' },
  });
});

test('a custom package carries only its length; no package at all, only the student', () => {
  const custom = subscription({ package: null, duration: 45 });
  expect(renewHref({ id: 's1', status: 'pending_renewal' }, custom)?.params).toEqual({ studentId: 's1', renew: '1', minutes: '45' });
  expect(renewHref({ id: 's1', status: 'pending_renewal' }, undefined)?.params).toEqual({ studentId: 's1', renew: '1' });
});
