import type { SubscriptionStatus } from '@ab/catalog';

/** `partial` is a derived status, sent as `paid=partial`. */
export type SubscriptionFilter = SubscriptionStatus | 'partial';

/** A teacher's sessions list filter: `all` sends no status; `unpaid` = earned + partially paid. */
export type SessionFilter = 'all' | 'unpaid' | 'paid';
