import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { message } from './inbox-fixture';
import { canRetry, canSendByHand, deliveryTitle, outboundNotes } from './message-notes';

const NOW = new Date('2026-10-01T12:00:00Z');
const out = (patch: Parameters<typeof message>[0]) => message({ id: 'm-out', direction: 'outbound', ...patch });

describe('outbound notes (R-MSG-05)', () => {
  it('inbound and delivered rows need no note', () => {
    expect(outboundNotes(message(), { waitingTemplate: false, now: NOW })).toEqual([]);
    expect(outboundNotes(out({ status: 'delivered' }), { waitingTemplate: false, now: NOW })).toEqual([]);
  });

  it('a failed row says why, in words', () => {
    const notes = outboundNotes(out({ status: 'failed', error_code: '131026' }), { waitingTemplate: false, now: NOW });
    expect(notes).toEqual([t.messages.errorLine.replace('{reason}', t.messages.errors['131026'])]);
  });

  it('queued: a template waiting on Meta wins over the scheduled time', () => {
    const later = out({ status: 'queued', scheduled_for: '2026-10-01T15:00:00Z' });
    expect(outboundNotes(later, { waitingTemplate: true, now: NOW })).toEqual([t.messages.waitingTemplate]);
    expect(outboundNotes(later, { waitingTemplate: false, now: NOW })[0]).toMatch(/^هتتبعت /);
    expect(outboundNotes(out({ status: 'queued', scheduled_for: '2026-10-01T11:00:00Z' }), { waitingTemplate: false, now: NOW })).toEqual([]);
  });

  it('queued after a failed try: tries so far, the error and the next try', () => {
    const row = out({ status: 'queued', attempts: 2, error_code: '130429', next_attempt_at: '2026-10-01T12:05:00Z' });
    const notes = outboundNotes(row, { waitingTemplate: false, now: NOW });
    expect(notes[0]).toBe('المحاولات: 2 من 3');
    expect(notes[1]).toContain(t.messages.errors['130429']);
    expect(notes[2]).toMatch(/^المحاولة الجاية /);
  });

  it('sent by hand says when', () => {
    const notes = outboundNotes(out({ status: 'sent_manually', sent_manually_at: '2026-10-01T11:00:00Z' }), {
      waitingTemplate: false,
      now: NOW,
    });
    expect(notes[0]).toMatch(/^اتبعتت يدوي /);
  });
});

describe('delivery title and actions', () => {
  it('lists the delivery times Meta reported; an inbound read_at is ours, not theirs', () => {
    const title = deliveryTitle(out({ sent_at: '2026-10-01T10:00:00Z', delivered_at: '2026-10-01T10:01:00Z' }));
    expect(title.split(' · ')).toHaveLength(2);
    expect(deliveryTitle(message({ read_at: '2026-10-01T10:00:00Z' }))).toBe('');
  });

  it('retry only failed rows; by hand any outbound row not out yet, with a link', () => {
    const link = 'https://wa.me/966501234567?text=x';
    expect(canRetry(out({ status: 'failed' }))).toBe(true);
    expect(canRetry(out({ status: 'queued' }))).toBe(false);
    expect(canSendByHand(out({ status: 'queued', click_to_chat: link }))).toBe(true);
    expect(canSendByHand(out({ status: 'failed', click_to_chat: null }))).toBe(false);
    expect(canSendByHand(out({ status: 'sent', click_to_chat: link }))).toBe(false);
    expect(canSendByHand(message({ click_to_chat: link }))).toBe(false);
  });
});
