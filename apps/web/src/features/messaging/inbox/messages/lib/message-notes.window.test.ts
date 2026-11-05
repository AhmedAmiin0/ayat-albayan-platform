import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { outboundNotes } from './message-notes';

// Owner 2026-11-03: a text held behind the reopen template says «بانتظار رد العائلة»; a failed
// one says why in Modern Standard Arabic, never the raw HTTP text.

const NOW = new Date('2026-11-03T08:00:00Z');
const o = { waitingTemplate: false, now: NOW, clock: { cycle: '24', locale } as const };
const out = (patch: Parameters<typeof message>[0]) =>
  message({ id: 'm-out', direction: 'outbound', ...patch });

describe('outbound notes and the 24 h window', () => {
  it('held: only «بانتظار رد العائلة», no tries and no next try (its deadline)', () => {
    const held = out({
      status: 'queued',
      error_code: 'awaiting_reply',
      attempts: 1,
      next_attempt_at: '2026-11-10T08:00:00Z',
      scheduled_for: '2026-11-03T08:00:00Z',
    });
    expect(outboundNotes(held, o)).toEqual([t.messages.awaitingReply]);
    expect(t.messages.awaitingReply).toBe('بانتظار رد العائلة');
  });

  it.each(['hold_expired', 'window_closed', 'reopen_unavailable', 'reopen_failed'] as const)(
    'failed %s: its reason in words',
    (code) => {
      const notes = outboundNotes(out({ status: 'failed', error_code: code }), o);
      expect(notes).toEqual([t.messages.errorLine.replace('{reason}', t.messages.errors[code])]);
    },
  );

  it('the 7-day expiry reads «انتهت مهلة الانتظار دون رد»', () => {
    expect(t.messages.errors.hold_expired).toBe('انتهت مهلة الانتظار دون رد');
  });
});
