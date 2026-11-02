import { t } from '@/core/lib/i18n/i18n';
import { errorLine, queuedLine } from './message-text';

// Owner 2026-11-03: a text held behind the reopen template, as the web says it.

const OPTS = { now: new Date('2026-11-03T09:00:00Z'), tz: 'Asia/Riyadh', cycle: '24' as const };

test('held: «بانتظار رد العائلة» instead of a time', () => {
  const held = {
    status: 'queued' as const,
    scheduled_for: '2026-11-03T08:00:00Z',
    error_code: 'awaiting_reply',
  };
  expect(queuedLine(held, OPTS)).toBe('بانتظار رد العائلة');
  expect(queuedLine({ ...held, status: 'failed' as const }, OPTS)).toBeNull();
  expect(queuedLine({ ...held, error_code: null }, OPTS)).toBeNull();
});

test('a failed window send says why in words, never the raw HTTP text', () => {
  const reason = (r: string) => t.messages.errorLine.replace('{reason}', r);
  expect(errorLine({ error_code: 'hold_expired' })).toBe(reason('انتهت مهلة الانتظار دون رد'));
  expect(errorLine({ error_code: 'window_closed' })).toBe(reason(t.messages.errors.window_closed));
  expect(errorLine({ error_code: 'reopen_unavailable' })).toBe(
    reason(t.messages.errors.reopen_unavailable),
  );
});
