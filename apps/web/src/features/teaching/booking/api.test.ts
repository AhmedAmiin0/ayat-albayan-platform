import { describe, expect, it } from 'vitest';
import { bookingCheckQuery, bookingTeachersQuery, parseBookSearch } from './api';

describe('parseBookSearch (/admin/book)', () => {
  it('a student id wins over a lead', () => {
    expect(parseBookSearch({ studentId: 's1', leadId: 'l1', phone: '+966' })).toEqual({ studentId: 's1' });
  });

  it('keeps the lead id with its phone and name, drops blanks and non-strings', () => {
    expect(parseBookSearch({ leadId: 'l1', phone: ' +966501234567 ', name: '' })).toEqual({
      leadId: 'l1',
      phone: '+966501234567',
    });
    expect(parseBookSearch({ leadId: 3, studentId: null })).toEqual({});
  });

  it('keeps a lead’s package size («اشترك» from the chat), parsed or raw; drops unknown ones', () => {
    expect(parseBookSearch({ leadId: 'l1', pkg: 8 })).toEqual({ leadId: 'l1', pkg: '8' });
    expect(parseBookSearch({ leadId: 'l1', pkg: 'trial' })).toEqual({ leadId: 'l1', pkg: 'trial' });
    expect(parseBookSearch({ leadId: 'l1', pkg: '9' })).toEqual({ leadId: 'l1' });
    expect(parseBookSearch({ studentId: 's1', pkg: '8' })).toEqual({ studentId: 's1' });
  });

  it('keeps a student’s booking type, and the missed lesson only for a makeup (from the lesson drawer)', () => {
    const missed = '5a2d9c1e-0000-4000-8000-000000000001';
    expect(parseBookSearch({ studentId: 's1', kind: 'makeup', missedLessonId: missed })).toEqual({
      studentId: 's1',
      kind: 'makeup',
      missedLessonId: missed,
    });
    expect(parseBookSearch({ studentId: 's1', kind: 'trial', missedLessonId: missed })).toEqual({ studentId: 's1', kind: 'trial' });
    expect(parseBookSearch({ studentId: 's1', kind: 'makeup', missedLessonId: 'not-a-uuid' })).toEqual({ studentId: 's1', kind: 'makeup' });
    expect(parseBookSearch({ studentId: 's1', kind: 'gift' })).toEqual({ studentId: 's1' });
    expect(parseBookSearch({ leadId: 'l1', kind: 'makeup' })).toEqual({ leadId: 'l1' });
  });

  it('keeps a free gap’s teacher and start next to anything else; a start alone or bad is dropped', () => {
    const id = '6f1c2a3e-1b2c-4d5e-8f90-123456789abc';
    expect(parseBookSearch({ teacherId: id, startsAt: '2026-10-04T13:00:00Z' })).toEqual({
      teacherId: id,
      startsAt: '2026-10-04T13:00:00.000Z',
    });
    expect(parseBookSearch({ studentId: 's1', teacherId: id, startsAt: 'soon' })).toEqual({ studentId: 's1', teacherId: id });
    expect(parseBookSearch({ teacherId: 't-1', startsAt: '2026-10-04T13:00:00Z' })).toEqual({});
  });
});

describe('bookingTeachersQuery', () => {
  it('filters by program, and by gender only when one is chosen', () => {
    expect(bookingTeachersQuery({ program: 'quran', gender: null }).queryKey.at(-1)).toBe('program=quran');
    expect(bookingTeachersQuery({ program: 'arabic', gender: 'female' }).queryKey.at(-1)).toBe(
      'program=arabic&gender=female',
    );
  });
});

describe('bookingCheckQuery', () => {
  it('ignores the meeting link and the idempotency key: typing the link never re-checks', () => {
    const body = { teacherId: 't', byday: [0], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 45 as const, startsOn: '2026-10-04', kind: 'package' as const, studentIds: ['s'] };
    const a = bookingCheckQuery({ ...body, meetingLink: null, clientRequestId: 'a' }).queryKey;
    expect(bookingCheckQuery({ ...body, meetingLink: 'https://meet.example/x', clientRequestId: 'b' }).queryKey).toEqual(a);
    expect(bookingCheckQuery({ ...body, startTimeLocal: '18:00', meetingLink: null }).queryKey).not.toEqual(a);
  });
});
