import { describe, expect, it } from 'vitest';
import { editableNow, sendLines, type SendWords } from './send-lines.js';

const words: SendWords = {
  editUntil: 'edit until {when}',
  editClosed: 'closed',
  sendsIn: 'goes in {when}',
  sending: 'going now',
  sent: 'sent',
  minutes: { one: '1 minute', two: '2 minutes', few: '{n} minutes', other: '{n} minutes' },
};
const when = (d: Date) => d.toISOString().slice(11, 16);
const UNTIL = '2026-11-11T10:30:00.000Z';
const report = { status: 'submitted' as const, can_edit: true, sent_at: null, edit_until: UNTIL };
const at = (iso: string) => new Date(iso);

describe('sendLines (docs/46 B5)', () => {
  it('inside the window: until when, and the countdown in minutes', () => {
    expect(sendLines(report, { now: at('2026-11-11T10:18:30Z'), when, words })).toEqual({
      edit: 'edit until 10:30', family: 'goes in 12 minutes',
    });
    expect(sendLines(report, { now: at('2026-11-11T10:29:30Z'), when, words }).family).toBe('goes in 1 minute');
  });

  it('closed for the teacher: «closed», then going now, then sent', () => {
    const closed = { ...report, can_edit: false };
    expect(sendLines(closed, { now: at('2026-11-11T10:31:00Z'), when, words })).toEqual({ edit: 'closed', family: 'going now' });
    const sent = { ...closed, sent_at: '2026-11-11T10:31:10Z' };
    expect(sendLines(sent, { now: at('2026-11-11T10:32:00Z'), when, words })).toEqual({ edit: 'closed', family: 'sent' });
  });

  it('an admin past the window (can_edit always): no edit line, only the family line', () => {
    const admin = { ...report, sent_at: '2026-11-11T10:31:10Z' };
    expect(sendLines(admin, { now: at('2026-11-12T09:00:00Z'), when, words })).toEqual({ edit: null, family: 'sent' });
  });

  it('a draft: no lines', () => {
    const draft = { status: 'draft' as const, can_edit: true, sent_at: null, edit_until: null };
    expect(sendLines(draft, { now: at(UNTIL), when, words })).toEqual({ edit: null, family: null });
  });
});

describe('editableNow (the sent list chip)', () => {
  it('needs can_edit AND a window still ahead on this clock', () => {
    expect(editableNow(report, at('2026-11-11T10:29:59Z'))).toBe(true);
    expect(editableNow(report, at(UNTIL))).toBe(false);
    expect(editableNow({ ...report, can_edit: false }, at('2026-11-11T10:00:00Z'))).toBe(false);
    expect(editableNow({ status: 'submitted', can_edit: true }, at(UNTIL))).toBe(false);
  });
});
