import { DEFAULT_JOIN_WINDOW } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { at, sampleLesson } from '../reminders.fakes';
import { joinCandidates, roomFor, sentLinks, type RoomContext } from './reminders.links';

// settings.meeting_link_auto (owner 2026-10-12): which link the reminders carry, and which families
// get their own classroom link. Invented data (reminders.fakes): lesson 14:00–14:45Z, two guardians.

const ORIGIN = 'https://app.example';
const ROOM = `${ORIGIN}/classroom/lesson-1`;
const STATIC: RoomContext = { auto: false, livekit: true, joinOk: true, origin: ORIGIN };
const AUTO: RoomContext = { ...STATIC, auto: true };
const DUE = { now: at('2026-10-04T13:10:00Z'), minutesBefore: 60, win: DEFAULT_JOIN_WINDOW };
const noLink = sampleLesson({ meeting_link: null });

const linkOf = (lesson = sampleLesson(), ctx = STATIC) => sentLinks([lesson], ctx)[0]?.meeting_link;
const keysOf = (lesson = sampleLesson(), ctx = STATIC, timing = DUE) => joinCandidates([lesson], ctx, timing).map((c) => c.dedupKey);

describe('static mode (the default)', () => {
  it('a lesson with its fixed link keeps it, and no family link is minted', () => {
    expect(linkOf()).toBe('https://meet.jit.si/ab-room-7');
    expect(roomFor(sampleLesson(), STATIC)).toBe(false);
    expect(keysOf()).toEqual([]);
  });

  it('a lesson without a link gets our classroom only when LiveKit is configured and the template approved', () => {
    expect(linkOf(noLink)).toBe(ROOM);
    expect(keysOf(noLink)).toHaveLength(3);
    for (const ctx of [{ ...STATIC, joinOk: false }, { ...STATIC, livekit: false }]) {
      expect(linkOf(noLink, ctx)).toBeNull();
      expect(keysOf(noLink, ctx)).toEqual([]);
    }
  });
});

describe('auto mode', () => {
  it('the classroom replaces the fixed link; one family link per student, lasting until the room closes', () => {
    expect(linkOf(sampleLesson(), AUTO)).toBe(ROOM);
    const candidates = joinCandidates([sampleLesson()], AUTO, DUE);
    expect(candidates.map((c) => c.dedupKey)).toEqual([
      'lesson_reminder:lesson-1:s-1:room',
      'lesson_reminder:lesson-1:s-2:room',
      'lesson_reminder:lesson-1:s-3:room',
    ]);
    expect(candidates[0]).toEqual({
      lessonId: 'lesson-1',
      studentId: 's-1',
      name: 'سهيلة',
      phone: '+966500000101',
      guardianId: 'g-riyadh',
      dedupKey: 'lesson_reminder:lesson-1:s-1:room',
      expiresAt: '2026-10-04T16:45:00.000Z',
    });
  });

  it('template not approved: the teacher still gets the classroom page, the families no link of their own', () => {
    const ctx = { ...AUTO, joinOk: false };
    expect(linkOf(sampleLesson(), ctx)).toBe(ROOM);
    expect(keysOf(sampleLesson(), ctx)).toEqual([]);
  });

  it('LiveKit not configured: never the fixed link instead', () => {
    const ctx = { ...AUTO, livekit: false };
    expect(linkOf(sampleLesson(), ctx)).toBeNull();
    expect(keysOf(sampleLesson(), ctx)).toEqual([]);
  });

  it('nothing before the same-day reminder is due, nor for a student without a guardian or a cancelled lesson', () => {
    expect(keysOf(sampleLesson(), AUTO, { ...DUE, now: at('2026-10-04T12:59:00Z') })).toEqual([]);
    expect(keysOf(sampleLesson(), AUTO, { ...DUE, now: at('2026-10-04T14:00:00Z') })).toEqual([]);
    const orphan = sampleLesson({ students: [{ id: 's-9', name: 'بدون', guardian: null }] });
    expect(keysOf(orphan, AUTO)).toEqual([]);
    expect(keysOf(sampleLesson({ status: 'cancelled_by_admin' }), AUTO)).toEqual([]);
  });

  it('the lesson rows themselves are never changed', () => {
    const lesson = sampleLesson();
    sentLinks([lesson], AUTO);
    expect(lesson.meeting_link).toBe('https://meet.jit.si/ab-room-7');
  });
});
