import { digest, goldenDates } from '@ab/shared/testing';
import { commissionsPath } from './api';

// Regression golden (docs/34 §7). Before the swap to the date-fns facade the old Date.UTC code
// ran beside the new one over this sweep and agreed on every value; the digest is the old code's.

test('a month\'s ?from&to as UTC instants [1st, next 1st), pinned', () => {
  const lines = goldenDates().map((d) => commissionsPath({ assistantId: '', status: '', month: d.slice(0, 7) }));
  expect(digest(lines)).toBe('380:de2e8a07');
  expect(commissionsPath({ assistantId: '', status: '', month: '2026-12' })).toBe(
    '/assistant-pay/commissions?from=2026-12-01T00%3A00%3A00.000Z&to=2027-01-01T00%3A00%3A00.000Z',
  );
});
