import { describe, expect, it } from 'vitest';
import { replyNote } from './reply-note.js';

const base = { direction: 'inbound' as const, body: 'تمام', guardian_id: 'g1', lead_id: null, lesson: null };
const lesson = (status: 'scheduled' | 'confirmed' | 'cancelled_by_admin') => ({ starts_at: '2026-10-04T14:00:00Z', status });

describe('replyNote: what a quick reply did (R-SCH-03)', () => {
  it('a guardian’s «تمام» that confirmed its lesson names it (Riyadh time)', () => {
    expect(replyNote({ ...base, lesson: lesson('confirmed') })).toEqual({ key: 'confirmed', when: 'الأحد 4 أكتوبر 17:00' });
  });

  it('nothing confirmed: no lesson found, or it could not be confirmed', () => {
    expect(replyNote(base)).toEqual({ key: 'notConfirmed', when: null });
    expect(replyNote({ ...base, lesson: lesson('cancelled_by_admin') })).toEqual({ key: 'notConfirmed', when: null });
  });

  it('a reschedule request names the lesson when one was linked', () => {
    const ask = { ...base, body: 'ممكن نأجل؟' };
    expect(replyNote({ ...ask, lesson: lesson('scheduled') })).toEqual({ key: 'reschedule', when: 'الأحد 4 أكتوبر 17:00' });
    expect(replyNote(ask)).toEqual({ key: 'rescheduleNoLesson', when: null });
  });

  it('«وقف» from a guardian or a lead', () => {
    expect(replyNote({ ...base, body: 'وقف الرسايل' })?.key).toBe('stop');
    expect(replyNote({ ...base, body: 'وقف', guardian_id: null, lead_id: 'l1' })?.key).toBe('stop');
  });

  it('nothing to say: a lead’s «تمام», plain text, our own messages', () => {
    expect(replyNote({ ...base, guardian_id: null, lead_id: 'l1' })).toBeNull();
    expect(replyNote({ ...base, body: 'السلام عليكم' })).toBeNull();
    expect(replyNote({ ...base, direction: 'outbound' })).toBeNull();
    expect(replyNote({ ...base, body: null })).toBeNull();
  });
});
