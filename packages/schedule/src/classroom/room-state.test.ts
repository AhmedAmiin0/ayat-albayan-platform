import { describe, expect, it } from 'vitest';
import { canEndLesson } from './moderation';
import { lessonEndResultSchema, lessonRoomStateSchema, roomEnded } from './room-state';

describe('lessonRoomStateSchema', () => {
  it('reads a live room with who is inside', () => {
    const room = {
      liveSince: '2026-11-16T10:00:00.000Z',
      endedAt: null,
      inRoom: [
        { name: 'أ. مريم', role: 'teacher' },
        { name: 'سارة', role: 'student' },
      ],
    };
    expect(lessonRoomStateSchema.parse(room)).toEqual(room);
  });

  it('refuses a login role the family must not see', () => {
    const room = { liveSince: null, endedAt: null, inRoom: [{ name: 'x', role: 'admin' }] };
    expect(lessonRoomStateSchema.safeParse(room).success).toBe(false);
  });

  it('the end answer carries the stamp', () => {
    expect(lessonEndResultSchema.parse({ endedAt: 'x' })).toEqual({ endedAt: 'x' });
  });
});

describe('roomEnded', () => {
  it('is true once lessons.room_ended_at is stamped', () => {
    expect(roomEnded({ room_ended_at: '2026-11-16T10:00:00.000Z' })).toBe(true);
    expect(roomEnded({ room_ended_at: null })).toBe(false);
    expect(roomEnded({})).toBe(false);
  });
});

describe('canEndLesson («إنهاء الحلقة للجميع»)', () => {
  it("is the teacher's or an admin's only", () => {
    const roles = ['teacher', 'admin', 'assistant', 'sales', 'guest', null] as const;
    expect(roles.map(canEndLesson)).toEqual([true, true, false, false, false, false]);
  });
});
