import { describe, expect, it } from 'vitest';
import type { ReplyLesson, ReplyRights } from './reply-lesson.js';
import { replyNote, type ReplyNoteContext } from './reply-note.js';

const base = { direction: 'inbound' as const, body: 'ايوة', guardian_id: 'g1', lead_id: null };
const ask = { ...base, body: 'تأجيل الحلقة إلى غدا' };
const NOW = new Date('2026-10-04T10:00:00Z');
const ALL: ReplyRights = { reschedule: true, confirm: 'sales' };
const NONE: ReplyRights = { reschedule: false, confirm: null };
const lesson = (status: ReplyLesson['status'], ends_at = '2026-10-04T15:00:00Z'): ReplyLesson => ({
  id: 'l1',
  starts_at: '2026-10-04T14:00:00Z',
  ends_at,
  status,
});
const ctx = (over: Partial<ReplyNoteContext>): ReplyNoteContext => ({ lesson: null, rights: ALL, now: NOW, ...over });
const WHEN = 'الأحد 4 أكتوبر 17:00';
const ENDED = '2026-10-04T09:00:00Z';

describe('replyNote: a «نعم» (R-SCH-03, owner 2026-10-28)', () => {
  it('its lesson confirmed: «تم تأكيد حلقة …» (Riyadh time), in the viewer’s language and clock', () => {
    expect(replyNote(base, ctx({ lesson: lesson('confirmed') }))).toEqual({ key: 'confirmed', when: WHEN, action: null });
    const en = ctx({ lesson: lesson('confirmed'), clock: { locale: 'en', cycle: '24' } });
    expect(replyNote(base, en)?.when).toBe('Sunday 4 October 17:00');
    expect(replyNote(base, ctx({ lesson: lesson('confirmed'), clock: { locale: 'ar', cycle: '12' } }))?.when).toBe('الأحد 4 أكتوبر 5:00 م');
  });

  it('reads in the viewer’s zone when given (docs/34): Cairo in summer time reads Riyadh’s clock', () => {
    const cairo = ctx({ lesson: lesson('confirmed'), clock: { locale: 'ar', cycle: '24', tz: 'Africa/Cairo' } });
    expect(replyNote(base, cairo)?.when).toBe(WHEN);
    const dubai = ctx({ lesson: lesson('confirmed'), clock: { locale: 'ar', cycle: '24', tz: 'Asia/Dubai' } });
    expect(replyNote(base, dubai)?.when).toBe('الأحد 4 أكتوبر 18:00');
  });

  it('a scheduled lesson (linked or the family’s next): the «تأكيد الحلقة» button alone', () => {
    const l = lesson('scheduled');
    expect(replyNote(base, ctx({ lesson: l }))).toEqual({ key: null, when: WHEN, action: { kind: 'confirm', lesson: l } });
    expect(replyNote(base, ctx({ lesson: { ...l, ends_at: null } }))?.action?.kind).toBe('confirm');
  });

  it('nothing at all, never «no lesson was confirmed»: no lesson, ended, closed, or no right to confirm', () => {
    expect(replyNote(base, ctx({}))).toBeNull();
    expect(replyNote(base, ctx({ lesson: lesson('scheduled', ENDED) }))).toBeNull();
    expect(replyNote(base, ctx({ lesson: lesson('cancelled_by_admin') }))).toBeNull();
    expect(replyNote(base, ctx({ lesson: lesson(null) }))).toBeNull();
    expect(replyNote(base, ctx({ lesson: lesson('scheduled'), rights: NONE }))).toBeNull();
  });
});

describe('replyNote: «تأجيل الحلقة»', () => {
  it('an open lesson she may move: «طلب تغيير موعد الحلقة» with «تغيير الموعد» for it', () => {
    const l = lesson('confirmed');
    expect(replyNote(ask, ctx({ lesson: l }))).toEqual({ key: 'reschedule', when: WHEN, action: { kind: 'reschedule', lesson: l } });
    expect(replyNote(ask, ctx({ lesson: lesson(null) }))?.action?.kind).toBe('reschedule');
  });

  it('no lesson, ended, closed or no right to move: «طلب تغيير الموعد» only', () => {
    const only = { key: 'rescheduleNoLesson', when: null, action: null };
    expect(replyNote(ask, ctx({}))).toEqual(only);
    expect(replyNote(ask, ctx({ lesson: lesson('scheduled', ENDED) }))).toEqual(only);
    expect(replyNote(ask, ctx({ lesson: lesson('cancelled_by_admin') }))).toEqual(only);
    expect(replyNote(ask, ctx({ lesson: lesson('scheduled'), rights: NONE }))).toEqual(only);
  });

  it('once moved (its lesson «rescheduled», or moved from this note): «تم تغيير موعد الحلقة»', () => {
    const done = { key: 'rescheduled', when: null, action: null };
    expect(replyNote(ask, ctx({ lesson: lesson('rescheduled') }))).toEqual(done);
    expect(replyNote(ask, ctx({ lesson: lesson('scheduled'), moved: true }))).toEqual(done);
  });
});

describe('replyNote: the rest', () => {
  it('«وقف» from a guardian or a lead, unchanged', () => {
    expect(replyNote({ ...base, body: 'وقف الرسايل' }, ctx({}))?.key).toBe('stop');
    expect(replyNote({ ...base, body: 'وقف', guardian_id: null, lead_id: 'l1' }, ctx({}))?.key).toBe('stop');
  });

  it('nothing to say: a lead’s «تمام», a rating button, plain text, our own messages', () => {
    const c = ctx({ lesson: lesson('scheduled') });
    expect(replyNote({ ...base, guardian_id: null, lead_id: 'l1' }, c)).toBeNull();
    expect(replyNote({ ...base, body: 'rate_good:l1' }, c)).toBeNull();
    expect(replyNote({ ...base, body: 'السلام عليكم' }, c)).toBeNull();
    expect(replyNote({ ...base, direction: 'outbound' }, c)).toBeNull();
    expect(replyNote({ ...base, body: null }, c)).toBeNull();
  });
});
