import type { SubscriptionStatus } from '@ab/catalog';

/** The packages list's status filter; `partial` is the derived «مدفوع جزئيًا» (`paid=partial`). */
export type SubscriptionFilter = SubscriptionStatus | 'partial';

/** A teacher's sessions list filter: `all` sends no status; `unpaid` = earned + partially paid. */
export type SessionFilter = 'all' | 'unpaid' | 'paid';
