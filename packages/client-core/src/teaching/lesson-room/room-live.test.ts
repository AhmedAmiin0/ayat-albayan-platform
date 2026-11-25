import type { LessonRoomState } from '@ab/schedule';
import { describe, expect, it } from 'vitest';
import { isRoomLive, roomEndedFor, roomLiveMinutes, studentWaiting } from './room-live';

const NOW = new Date('2026-11-16T10:12:30.000Z');
const room = (over: Partial<LessonRoomState> = {}): LessonRoomState => ({
  liveSince: '2026-11-16T10:00:00.000Z',
  endedAt: null,
  inRoom: [{ name: 'سارة', role: 'student' }],
  ...over,
});

describe('the live room', () => {
  it('is live with someone inside, for whole minutes', () => {
    expect(isRoomLive(room())).toBe(true);
    expect(roomLiveMinutes(room(), NOW)).toBe(12);
  });

  it('is not live empty, ended, or with no state', () => {
    expect(isRoomLive(room({ inRoom: [], liveSince: null }))).toBe(false);
    expect(isRoomLive(room({ endedAt: '2026-11-16T10:05:00.000Z' }))).toBe(false);
    expect(isRoomLive(null)).toBe(false);
    expect(roomLiveMinutes(undefined, NOW)).toBeNull();
  });

  it('never counts negative minutes (a clock behind the server)', () => {
    expect(roomLiveMinutes(room({ liveSince: '2026-11-16T10:20:00.000Z' }), NOW)).toBe(0);
  });

  it('«الطالب ينتظرك»: the family inside, the teacher not yet', () => {
    expect(studentWaiting(room())).toBe(true);
    expect(
      studentWaiting(
        room({
          inRoom: [
            { name: 'أ. مريم', role: 'teacher' },
            { name: 'سارة', role: 'student' },
          ],
        }),
      ),
    ).toBe(false);
    expect(studentWaiting(room({ inRoom: [{ name: 'أ. مريم', role: 'teacher' }] }))).toBe(false);
  });

  it('«انتهت الحلقة» once ended for everyone', () => {
    expect(roomEndedFor(room({ endedAt: 'x' }))).toBe(true);
    expect(roomEndedFor(room())).toBe(false);
    expect(roomEndedFor(null)).toBe(false);
  });
});
