import type { QuoteFx, QuoteResponse } from './use-quote';

// Test-only API answers, copied from GET /pricing/quote responses (the pricing handbook examples).

/** ?tier=bulk&country=SA&students=2&discount=10 */
export const bulkSa: QuoteResponse = {
  package: 'bulk',
  lessons: 28,
  duration: 45,
  country: 'SA',
  currency: 'SAR',
  price: 385,
  students: 2,
  total: 770,
  discount: 10,
  afterDiscount: 693,
  perLesson: 12.38,
  insteadOf: 420,
  savingsPct: 8,
  popular: false,
  featured: true,
  fx: null,
};

export const erApiRate: QuoteFx = {
  quote: 'USD',
  rate: 0.266667,
  date: '2026-10-02T00:00:01+00:00',
  provider: 'open.er-api.com',
  fallback: false,
  ageHours: null,
};

export const pegRate: QuoteFx = {
  quote: 'USD',
  rate: 0.266667,
  date: null,
  provider: 'peg',
  fallback: true,
  ageHours: null,
};

/** ?tier=starter&country=EG (any non-site country → USD). */
export const starterUsd: QuoteResponse = {
  package: 'starter',
  lessons: 8,
  duration: 45,
  country: null,
  currency: 'USD',
  price: 32,
  students: 1,
  total: 32,
  discount: 0,
  afterDiscount: 32,
  perLesson: 4,
  insteadOf: null,
  savingsPct: null,
  popular: false,
  featured: false,
  fx: erApiRate,
};
