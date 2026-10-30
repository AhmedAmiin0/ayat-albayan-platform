import { describe, expect, it } from 'vitest';
import {
  cutoffOf,
  liveRooms,
  meetingOverdue,
  openTooLong,
  ownedRooms,
  roomOverdue,
} from './max-duration.rule';
import { L1, M1, NOW, overdue } from './max-duration.fakes';

const cutoff = cutoffOf(120, NOW) ?? new Date(0);
const ago = (min: number): string => new Date(NOW.getTime() - min * 60_000).toISOString();

describe('cutoffOf (settings.meeting_max_minutes)', () => {
  it('is now minus the limit', () => {
    expect(cutoffOf(120, NOW)?.toISOString()).toBe('2026-10-30T10:00:00.000Z');
  });

  it('is off (null) for 0, empty, negative or not a whole number', () => {
    for (const v of [0, null, undefined, -5, 1.5, Number.NaN]) expect(cutoffOf(v, NOW)).toBeNull();
  });
});

describe('openTooLong', () => {
  it('exactly at the limit stays open; a millisecond over closes', () => {
    expect(openTooLong(ago(120), cutoff)).toBe(false);
    expect(openTooLong(new Date(cutoff.getTime() - 1), cutoff)).toBe(true);
    expect(openTooLong(ago(119), cutoff)).toBe(false);
  });

  it('an unknown or unreadable time is never closed', () => {
    expect(openTooLong(null, cutoff)).toBe(false);
    expect(openTooLong('not a date', cutoff)).toBe(false);
  });
});

describe('meetingOverdue', () => {
  it('an instant meeting counts from its creation, a scheduled one from its start', () => {
    expect(meetingOverdue(overdue(M1, { created_at: ago(121) }), cutoff)).toBe(true);
    expect(meetingOverdue(overdue(M1, { created_at: ago(120) }), cutoff)).toBe(false);
    const scheduled = overdue(M1, { created_at: ago(600), starts_at: ago(60) });
    expect(meetingOverdue(scheduled, cutoff)).toBe(false);
    expect(meetingOverdue({ ...scheduled, starts_at: ago(121) }, cutoff)).toBe(true);
  });

  it('an ended or cancelled meeting is never selected', () => {
    const old = { created_at: ago(300) };
    expect(meetingOverdue(overdue(M1, { ...old, ends_at: ago(200) }), cutoff)).toBe(false);
    expect(meetingOverdue(overdue(M1, { ...old, cancelled_at: ago(200) }), cutoff)).toBe(false);
  });
});

describe('rooms', () => {
  const secs = (min: number) => String(Math.floor(NOW.getTime() / 1000) - min * 60);

  it('reads ListRooms: creation_time_ms first, else creation_time (seconds)', () => {
    const answer = {
      rooms: [
        { name: 'a', creation_time: secs(10), creation_time_ms: String(NOW.getTime() - 60_000) },
        { name: 'b', creation_time: secs(10) },
        { name: 'c' },
        { nope: true },
      ],
    };
    const rooms = liveRooms(answer);
    expect(rooms.map((r) => r.name)).toEqual(['a', 'b', 'c']);
    expect(rooms[0]?.createdAt?.toISOString()).toBe('2026-10-30T11:59:00.000Z');
    expect(rooms[1]?.createdAt?.toISOString()).toBe('2026-10-30T11:50:00.000Z');
    expect(rooms[2]?.createdAt).toBeNull();
    expect(liveRooms({})).toEqual([]);
  });

  it('keeps only rooms the platform named, minus the ones already handled', () => {
    const rooms = [`lesson-${L1}`, `meeting-${M1}`, 'standup', 'lesson-123', `x-lesson-${L1}`]
      .map((name) => ({ name, createdAt: new Date(0) }));
    const owned = ownedRooms(rooms, new Set([`meeting-${M1}`]));
    expect(owned.map((r) => r.target)).toEqual([{ kind: 'lesson', id: L1 }]);
  });

  it('closes a room created over the limit, or a lesson room opened over the limit', () => {
    const lesson = { name: `lesson-${L1}`, createdAt: new Date(ago(10)), target: { kind: 'lesson' as const, id: L1 } };
    const none = { cutoff, lessonsOpenedLong: new Set<string>() };
    expect(roomOverdue(lesson, none)).toBe(false);
    expect(roomOverdue({ ...lesson, createdAt: new Date(ago(120)) }, none)).toBe(false);
    expect(roomOverdue({ ...lesson, createdAt: new Date(ago(121)) }, none)).toBe(true);
    expect(roomOverdue({ ...lesson, createdAt: null }, none)).toBe(false);
    expect(roomOverdue(lesson, { cutoff, lessonsOpenedLong: new Set([L1]) })).toBe(true);
    const meeting = { ...lesson, target: { kind: 'meeting' as const, id: L1 } };
    expect(roomOverdue(meeting, { cutoff, lessonsOpenedLong: new Set([L1]) })).toBe(false);
  });
});
