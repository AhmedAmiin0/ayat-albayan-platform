import { expect, it } from 'vitest';

// The goldens again, with the HOST zone in London (GMT / BST): same digests as under TZ=UTC, though
// London is UTC itself half the year (host-new-york.golden explains why).
process.env.TZ = 'Europe/London';
await import('./zoned.golden.test.js');
await import('./reminders.golden.test.js');

it('runs on a DST host: BST (UTC+1) in July', () => {
  expect(new Date('2026-07-15T12:00:00Z').getTimezoneOffset()).toBe(-60);
});
