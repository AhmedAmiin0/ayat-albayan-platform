import { DEFAULT_RENEWAL_PRICING } from '@ab/money';
import type { SalesFamilyStudent } from '../sales/money-family.schemas';
import type { SalesMoneySubscriptionView } from '../sales/student-file/subscribe.schemas';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const REF = { id: STUDENT, code: 'AB-0183', name: 'سهيلة' };

/** A package of hers still owed: 145 SAR, 45 paid. */
export const salesOwedPackage = (
  patch: Partial<SalesMoneySubscriptionView> = {},
): SalesMoneySubscriptionView => ({
  id: 'c1000000-0000-4000-8000-0000000000c1',
  student: REF,
  package: '8',
  duration: 45,
  lessons_total: 8,
  price: 145,
  currency: 'SAR',
  starts_on: '2026-11-01',
  status: 'active',
  paid: 45,
  due: 100,
  ...patch,
});

/** One child of GET /sales/money/family: her trial student, nothing owed, no renewal due. */
export const salesFamilyStudent = (
  patch: Partial<SalesFamilyStudent> = {},
): SalesFamilyStudent => ({
  ...REF,
  status: 'trial',
  mine: true,
  open: [],
  renew_due: false,
  renewal: DEFAULT_RENEWAL_PRICING,
  teacher_id: null,
  ...patch,
});
