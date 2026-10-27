import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message } from '../../testing/inbox-fixture';
import { canRetry, canSendByHand, deliveryTitle, isHandedOff, outboundNotes } from './message-notes';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;

const NOW = new Date('2026-10-01T12:00:00Z');
const out = (patch: Parameters<typeof message>[0]) => message({ id: 'm-out', direction: 'outbound', ...patch });

describe('outbound notes (R-MSG-05)', () => {
  it('inbound and delivered rows need no note', () => {
    expect(outboundNotes(message(), { waitingTemplate: false, now: NOW, clock: C24 })).toEqual([]);
    expect(outboundNotes(out({ status: 'delivered' }), { waitingTemplate: false, now: NOW, clock: C24 })).toEqual([]);
  });

  it('a failed row says why, in words', () => {
    const notes = outboundNotes(out({ status: 'failed', error_code: '131026' }), { waitingTemplate: false, now: NOW, clock: C24 });
    expect(notes).toEqual([t.messages.errorLine.replace('{reason}', t.messages.errors['131026'])]);
  });

  it('queued: a template waiting on Meta wins over the scheduled time', () => {
    const later = out({ status: 'queued', scheduled_for: '2026-10-01T15:00:00Z' });
    expect(outboundNotes(later, { waitingTemplate: true, now: NOW, clock: C24 })).toEqual([t.messages.waitingTemplate]);
    expect(outboundNotes(later, { waitingTemplate: false, now: NOW, clock: C24 })[0]).toMatch(/^ستُرسل /);
    expect(outboundNotes(out({ status: 'queued', scheduled_for: '2026-10-01T11:00:00Z' }), { waitingTemplate: false, now: NOW, clock: C24 })).toEqual([]);
  });

  it('queued after a failed try: tries so far, the error and the next try', () => {
    const row = out({ status: 'queued', attempts: 2, error_code: '130429', next_attempt_at: '2026-10-01T12:05:00Z' });
    const notes = outboundNotes(row, { waitingTemplate: false, now: NOW, clock: C24 });
    expect(notes[0]).toBe('المحاولات: 2 من 3');
    expect(notes[1]).toContain(t.messages.errors['130429']);
    expect(notes[2]).toMatch(/^المحاولة القادمة /);
  });

  it('claimed by the sender right now: «تُرسل الآن», not the lease as «المحاولة الجاية»', () => {
    const row = out({ status: 'queued', attempts: 1, error_code: 'sending', next_attempt_at: '2026-10-01T12:02:00Z' });
    expect(outboundNotes(row, { waitingTemplate: false, now: NOW, clock: C24 })).toEqual([t.messages.sendingNow]);
  });

  it('a hand-off has no error line: the «بعتّها؟» question stands in for it', () => {
    expect(outboundNotes(out({ status: 'failed', error_code: 'handed_off' }), { waitingTemplate: false, now: NOW, clock: C24 })).toEqual([]);
  });

  it('sent by hand says when', () => {
    const notes = outboundNotes(out({ status: 'sent_manually', sent_manually_at: '2026-10-01T11:00:00Z' }), {
      waitingTemplate: false,
      now: NOW,
      clock: C24,
    });
    expect(notes[0]).toMatch(/^أُرسلت يدويًا /);
  });
});

describe('delivery title and actions', () => {
  it('lists the delivery times Meta reported; an inbound read_at is ours, not theirs', () => {
    const title = deliveryTitle(out({ sent_at: '2026-10-01T10:00:00Z', delivered_at: '2026-10-01T10:01:00Z' }), C24);
    expect(title.split(' · ')).toHaveLength(2);
    expect(deliveryTitle(message({ read_at: '2026-10-01T10:00:00Z' }), C24)).toBe('');
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

  it('a row the sender is sending right now: no wa.me, no hand-off (the API sends no link)', () => {
    const claimed = out({ status: 'queued', attempts: 1, error_code: 'sending', click_to_chat: null });
    expect(canSendByHand(claimed)).toBe(false);
    expect(canRetry(claimed)).toBe(false);
    expect(isHandedOff(claimed)).toBe(false);
  });

  it('no «حاول مرة أخرى» where it cannot help; a hand-off is answered by its own question', () => {
    for (const code of ['131026', '131047', 'expired', 'stale', 'handed_off']) {
      expect(canRetry(out({ status: 'failed', error_code: code }))).toBe(false);
    }
    expect(canRetry(out({ status: 'failed', error_code: 'uncertain' }))).toBe(true);
    expect(isHandedOff(out({ status: 'failed', error_code: 'handed_off' }))).toBe(true);
    expect(isHandedOff(out({ status: 'queued', error_code: 'handed_off' }))).toBe(false);
  });
});
