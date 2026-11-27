import type { QuoteResponse, StudentBalanceView, SubscriptionView } from '@ab/money';
import type { StudentProfileView } from '@ab/shared';
import { subscription } from '@/payments/fixtures';
import { profile as student } from '@/students/shared/test-data';

// Invented API answers for the subscribe screen tests (no real people).

export const CHILD = '44444444-4444-4444-8444-444444444444';
export const SISTER = '55555555-5555-4555-8555-555555555555';

export const profile: StudentProfileView = {
  ...student,
  id: CHILD,
  guardian_id: 'g-1',
  name: 'يوسف',
  guardian: { ...student.guardian, id: 'g-1', name: 'أم يوسف', students: [] },
  siblings: [{ id: SISTER, code: 'AB-0184', name: 'سارة', status: 'active' }],
};

export const quote: QuoteResponse = {
  package: 'standard',
  lessons: 12,
  duration: 45,
  country: 'SA',
  currency: 'SAR',
  price: 180,
  students: 1,
  total: 180,
  discount: 0,
  afterDiscount: 180,
  perLesson: 15,
  insteadOf: null,
  savingsPct: null,
  popular: true,
  featured: false,
  fx: null,
};

/** A saved package row (the payments fixture's shape) with this id. */
export const saved = (id: string): SubscriptionView => subscription({ id });

export function balance(current: SubscriptionView | null): StudentBalanceView {
  return { student_id: CHILD, remaining: 0, current, packages: current ? [current] : [] };
}
