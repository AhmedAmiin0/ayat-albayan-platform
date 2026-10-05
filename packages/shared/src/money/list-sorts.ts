// Server sort keys of the money lists (R-NFR-08): the API allowlists them (`listSortShape`) and
// maps each to a column; the web reads them from the URL. Derived values (balance, outstanding,
// names resolved by a second read) are not keys: Postgres cannot order the page by them.

/** GET /payments: paid day (the default, newest first), amount, method. */
export const PAYMENT_SORT_KEYS = ['paid_at', 'amount', 'method'] as const;
/** GET /subscriptions: created (the default, newest first), package, price, status. */
export const SUBSCRIPTION_SORT_KEYS = ['created_at', 'package', 'price', 'status'] as const;
/** GET /invoices/recent: created (the default, newest first), kind. */
export const INVOICE_SORT_KEYS = ['created_at', 'kind'] as const;
/** GET …/earnings sessions: date (the default, newest first), length, amount, paid, status. */
export const EARNING_SORT_KEYS = ['starts_at', 'minutes', 'amount', 'paid_amount', 'status'] as const;
/** GET …/earnings payments: paid day (the default, newest first), amount, method. */
export const TEACHER_PAYMENT_SORT_KEYS = ['paid_at', 'amount', 'method'] as const;
