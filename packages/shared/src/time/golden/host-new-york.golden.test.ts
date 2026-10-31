import { expect, it } from 'vitest';

// The goldens again, with the HOST zone (the phone's, the browser's) in New York: two DST changes a
// year. The facade reads only the zone it is given, never the host's, so the digests pinned under
// TZ=UTC must not move (addDaysIn once stepped with a host-local setDate: 23 / 25 h here). Node
// applies a runtime TZ change; the first test proves it did, so a no-op host cannot pass silently.
process.env.TZ = 'America/New_York';
await import('./zoned.golden.test.js');
await import('./reminders.golden.test.js');

it('runs on a DST host: EST (UTC-5) in January, EDT (UTC-4) in July', () => {
  expect(new Date('2026-01-15T12:00:00Z').getTimezoneOffset()).toBe(300);
  expect(new Date('2026-07-15T12:00:00Z').getTimezoneOffset()).toBe(240);
});
