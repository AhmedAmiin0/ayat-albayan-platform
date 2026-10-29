import { DEFAULT_RENEWAL_PRICING, type SalesFamilyStudent, type SalesMoneySubscriptionView } from '@ab/shared';
import { pickMoneyAction } from './money-action';

const PHONE = '+966501112223';
const owed = (id: string) => ({ id }) as SalesMoneySubscriptionView;
const kid = (over: Partial<SalesFamilyStudent> = {}): SalesFamilyStudent => ({
  id: 'st1', code: 'AB-0201', name: 'ريم', status: 'trial', open: [], renew_due: false, renewal: DEFAULT_RENEWAL_PRICING, ...over,
});
const family = (...students: SalesFamilyStudent[]) => ({ students });

test('an owed package wins: «تسجيل تحويل» on the transfer screen with that package picked', () => {
  const f = family(kid({ open: [owed('p1'), owed('p2')], renew_due: true }));
  expect(pickMoneyAction(f, { studentId: 'st1', phone: PHONE })).toEqual({
    kind: 'transfer',
    href: { pathname: '/inbox/sales-transfer', params: { phone: PHONE, subscriptionId: 'p1' } },
  });
  // A pending row's own package is picked when it is owed; another id falls back to the first owed.
  expect(pickMoneyAction(f, { studentId: 'st1', phone: PHONE, subscriptionId: 'p2' })?.href).toMatchObject({ params: { subscriptionId: 'p2' } });
  expect(pickMoneyAction(f, { studentId: 'st1', phone: PHONE, subscriptionId: 'x' })?.href).toMatchObject({ params: { subscriptionId: 'p1' } });
});

test('nothing owed and a renewal due: «تجديد» on the subscribe screen for that child', () => {
  expect(pickMoneyAction(family(kid({ renew_due: true })), { studentId: 'st1', phone: PHONE })).toEqual({
    kind: 'renew',
    href: { pathname: '/inbox/sales-subscribe', params: { phone: PHONE, studentId: 'st1', renew: '1' } },
  });
});

test('nothing owed or due, another family, no phone or no data: no action', () => {
  expect(pickMoneyAction(family(kid()), { studentId: 'st1', phone: PHONE })).toBeNull();
  expect(pickMoneyAction(family(kid({ renew_due: true })), { studentId: 'st2', phone: PHONE })).toBeNull();
  expect(pickMoneyAction(family(kid({ renew_due: true })), { studentId: 'st1', phone: '' })).toBeNull();
  expect(pickMoneyAction(undefined, { studentId: 'st1', phone: PHONE })).toBeNull();
});
