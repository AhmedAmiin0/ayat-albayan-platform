import { describe, expect, it, vi } from 'vitest';
import { LessonRoomStates } from '@/modules/teaching/lessons/live-room/lesson-room-states';
import type { RoomInsideRepo } from '@/modules/teaching/lessons/live-room/room-inside.repo';

const NOW = new Date('2026-11-16T10:10:00.000Z');
const lesson = (id: string, startH: number, over: { room_ended_at?: string | null } = {}) => ({
  id,
  starts_at: new Date(NOW.getTime() + startH * 3_600_000).toISOString(),
  ends_at: new Date(NOW.getTime() + (startH + 0.5) * 3_600_000).toISOString(),
  ...over,
});
const teacher = {
  lesson_id: 'now',
  name: 'أ. مريم',
  role: 'teacher',
  entered_at: '2026-11-16T10:00:00.000Z',
  link: null,
};
const states = (inside: RoomInsideRepo['inside']) =>
  new LessonRoomStates({ inside } as unknown as RoomInsideRepo);

describe('LessonRoomStates', () => {
  it('looks up only the lessons near now, and maps each', async () => {
    const inside = vi.fn().mockResolvedValue([teacher]);
    const map = await states(inside).of(
      [lesson('now', 0), lesson('tomorrow', 24), lesson('ended', -1, { room_ended_at: 'x' })],
      NOW,
    );
    expect(inside).toHaveBeenCalledWith(['now', 'ended']);
    expect(map.get('now')).toMatchObject({
      liveSince: teacher.entered_at,
      inRoom: [{ role: 'teacher' }],
    });
    expect(map.get('tomorrow')).toBeNull();
    expect(map.get('ended')).toEqual({ liveSince: null, endedAt: 'x', inRoom: [] });
  });

  it('a failed read is no live state, never an error on the schedule', async () => {
    const map = await states(vi.fn().mockRejectedValue(new Error('down'))).of(
      [lesson('now', 0)],
      NOW,
    );
    expect(map.get('now')).toBeNull();
  });
});
