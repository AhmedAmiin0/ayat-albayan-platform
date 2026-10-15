import { quote, STUDENT_STATUSES, type QuoteOptions } from '@ab/shared';
import { subscription } from '@/payments/fixtures';
import { formFrom } from '@/subscribe/form-prefill';
import { renewHref } from './renew';

const priced = (o: QuoteOptions) => ({ ...quote(o), fx: null });

test('only a package-ended student (pending_renewal, expired) can renew', () => {
  const shown = STUDENT_STATUSES.filter((status) => renewHref({ id: 's1', status }, null) !== null);
  expect(shown).toEqual(['pending_renewal', 'expired']);
});

test('a tier: its plan, lesson length, discount and country, titled as a renewal', () => {
  const source = priced({ tier: 'premium', duration: 60, country: 'AE', students: 1, discount: 10 });
  const last = subscription({ package: '20', duration: 60, price_source: source });
  expect(renewHref({ id: 's1', status: 'expired' }, last)).toEqual({
    pathname: '/students/subscribe',
    params: { studentId: 's1', renew: '1', plan: 'premium', minutes: '60', discount: '10', country: 'AE' },
  });
});

test('a custom count keeps its count; a USD quote leaves the country to the guardian', () => {
  const source = priced({ count: 14, duration: 30, country: null, usdRate: 3.75, students: 1, discount: 5 });
  const last = subscription({ package: null, duration: 30, lessons_total: 14, price_source: source });
  const href = renewHref({ id: 's1', status: 'pending_renewal' }, last);
  expect(href?.params).toEqual({ studentId: 's1', renew: '1', plan: 'custom', count: '14', minutes: '30', discount: '5' });
  // The subscribe screen opens on exactly that package.
  expect(formFrom(href?.params ?? {})).toEqual({ plan: 'custom', count: 14, duration: '30', discount: '5', country: 'guardian' });
});

test('no package at all: only the student', () => {
  expect(renewHref({ id: 's1', status: 'pending_renewal' }, undefined)?.params).toEqual({ studentId: 's1', renew: '1' });
});
