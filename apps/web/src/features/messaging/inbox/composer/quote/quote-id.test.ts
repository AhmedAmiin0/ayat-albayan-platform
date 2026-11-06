import type { MessageView } from '@ab/shared';
import { afterEach, expect, it } from 'vitest';
import { clearQuoteIds, quoteIdOf, quoteSent, quoteUnconfirmed, resolveQuote } from './quote-id';

// docs/44 BUG7 (review H2): «أرسل العرض»'s id lives per chat outside the dialog, so reopening
// it after no answer retries with the same id; a read showing the first offer releases it.

afterEach(clearQuoteIds);

const A = '+966501234567';
const AT = '2026-10-02T09:00:00.000Z';
const row = (body: string) =>
  ({ id: 'srv', direction: 'outbound', body, template_key: null, created_at: AT }) as MessageView;

it('the same id until an offer goes (a closed and reopened dialog included), per chat', () => {
  const first = quoteIdOf(A).id;
  expect(quoteIdOf(A).id).toBe(first);
  expect(quoteIdOf('+966507654321').id).not.toBe(first);
  quoteSent(A);
  expect(quoteIdOf(A).id).not.toBe(first);
});

it('an unconfirmed offer keeps its FIRST text; a read showing it releases the id', () => {
  const id = quoteIdOf(A).id;
  quoteUnconfirmed(A, { text: 'العرض', at: AT, known: new Set() });
  quoteUnconfirmed(A, { text: 'عرض آخر', at: AT, known: new Set() });
  expect(quoteIdOf(A).unconfirmed?.text).toBe('العرض');
  resolveQuote(A, [row('عرض آخر')]);
  expect(quoteIdOf(A).id).toBe(id);
  resolveQuote(A, [row('العرض')]);
  expect(quoteIdOf(A).id).not.toBe(id);
});

it('sign-out forgets the ids', () => {
  const id = quoteIdOf(A).id;
  clearQuoteIds();
  expect(quoteIdOf(A).id).not.toBe(id);
});
