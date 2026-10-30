import {
  countsForMoney,
  type PaymentView,
  type QuoteResponse,
  type SalesMoneySubscriptionView,
  type SalesPaymentView,
  type SalesQuoteView,
  type StudentStatus,
  type SubscriptionView,
} from '@ab/shared';

// The whitelists of the salesperson's money responses (docs/16 row 16): explicit keys, never a spread of
// the admin's view, so a column added there never leaks here (fx rate, price_source, notes, recorder…).

const cents = (n: number): number => Math.round(n * 100) / 100;

export function toSalesQuote(q: QuoteResponse): SalesQuoteView {
  return {
    package: q.package,
    lessons: q.lessons,
    duration: q.duration,
    currency: q.currency,
    discount: q.discount,
    afterDiscount: q.afterDiscount,
    perLesson: q.perLesson,
  };
}

export function toSalesSubscription(s: SubscriptionView): SalesMoneySubscriptionView {
  return {
    id: s.id,
    student: { id: s.student.id, code: s.student.code, name: s.student.name },
    package: s.package,
    duration: s.duration,
    lessons_total: s.lessons_total,
    lessons_used_before: s.lessons_used_before ?? 0,
    price: s.price,
    currency: s.currency,
    starts_on: s.starts_on,
    status: s.status,
    paid: s.paid,
    // An unused cancel is never owed (owner 2026-10-28); a stopped package still is (2026-10-30).
    due: countsForMoney(s) ? Math.max(0, cents(s.price - s.paid)) : 0,
  };
}

export function toSalesPayment(p: PaymentView, status: StudentStatus): SalesPaymentView {
  return {
    id: p.id,
    subscription_id: p.subscription_id,
    student: { id: p.student.id, code: p.student.code, name: p.student.name, status },
    amount: p.amount,
    currency: p.currency,
    method: p.method,
    kind: p.kind,
    paid_at: p.paid_at,
    note: p.note,
    created_at: p.created_at,
  };
}
