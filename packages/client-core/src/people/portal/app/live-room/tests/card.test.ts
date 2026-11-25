import { describe, expect, it } from 'vitest';
import { cardRoom } from '../live-room';

const now = new Date('2026-11-16T15:34:00Z');
const teacher = { name: 'فاطمة', role: 'teacher' as const };

describe('cardRoom', () => {
  it('is ended once the room was ended for everyone, even with people listed', () => {
    const room = { liveSince: null, endedAt: '2026-11-16T16:05:00Z', inRoom: [teacher] };
    expect(cardRoom({ room }, now)).toEqual({ kind: 'ended', endedAt: '2026-11-16T16:05:00Z' });
  });

  it('is live with the minutes and the teacher while someone is inside', () => {
    const room = { liveSince: '2026-11-16T15:30:00Z', endedAt: null, inRoom: [teacher] };
    expect(cardRoom({ room }, now)).toEqual({
      kind: 'live',
      live: { minutes: 4, teacherIn: true, people: [teacher] },
    });
  });

  it('is nothing for an empty room, a null room or an older API without it', () => {
    const empty = { liveSince: null, endedAt: null, inRoom: [] };
    expect(cardRoom({ room: empty }, now)).toEqual({ kind: 'none' });
    expect(cardRoom({ room: null }, now)).toEqual({ kind: 'none' });
    expect(cardRoom({}, now)).toEqual({ kind: 'none' });
  });
});
