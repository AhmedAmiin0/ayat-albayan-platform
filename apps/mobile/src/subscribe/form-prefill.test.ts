import { formFrom, type FormPrefill } from './form-prefill';
import { INITIAL_FORM } from './subscribe-form';

test('after a booking: its package size and lesson length prefill the plan', () => {
  expect(formFrom({ pkg: '12', minutes: '60' })).toMatchObject({ plan: 'standard', duration: '60' });
  expect(formFrom({ pkg: '28', minutes: '30' })).toMatchObject({ plan: 'bulk', duration: '30' });
  // 4 × 90 is «باقة الحلقة الأسبوعية»: its length is fixed, the pill keeps the default.
  expect(formFrom({ pkg: '4', minutes: '90' })).toMatchObject({ plan: 'weekly', duration: '45' });
  expect(formFrom({})).toEqual(INITIAL_FORM);
});

test('a renewal: plan, custom count, minutes, discount and country all carry over', () => {
  expect(formFrom({ plan: 'custom', count: '14', minutes: '30', discount: '12.5', country: 'AE' })).toEqual({
    plan: 'custom',
    count: 14,
    duration: '30',
    discount: '12.5',
    country: 'AE',
  });
  expect(formFrom({ plan: 'premium', minutes: '60', discount: '10' })).toEqual({
    ...INITIAL_FORM,
    plan: 'premium',
    duration: '60',
    discount: '10',
  });
});

test('the plan wins over a booking size', () => {
  expect(formFrom({ plan: 'starter', pkg: '12' }).plan).toBe('starter');
});

test.each<[string, FormPrefill]>([
  ['plan', { plan: 'gold' }],
  ['count below the range', { plan: 'custom', count: '0' }],
  ['count above the range', { plan: 'custom', count: '61' }],
  ['fractional count', { plan: 'custom', count: '2.5' }],
  ['non-numeric count', { plan: 'custom', count: 'ten' }],
  ['discount above 100', { discount: '150' }],
  ['negative discount', { discount: '-5' }],
  ['empty discount', { discount: '' }],
  ['country outside the five', { country: 'EG' }],
  ['minutes outside the pills', { minutes: '50' }],
])('an invalid %s keeps the default', (_name, params) => {
  const plan = params.plan === 'custom' ? 'custom' : INITIAL_FORM.plan;
  expect(formFrom(params)).toEqual({ ...INITIAL_FORM, plan });
});
