import { describe, expect, it, vi } from 'vitest';
import type { LessonLivePush } from './lesson-live.push';
import type { RoomPresenceRepo } from './room-presence.repo';
import { RoomPresenceService } from './room-presence.service';

const LESSON = '00000000-0000-4000-8000-0000000000d1';
const NOW = new Date('2026-11-16T10:00:00.000Z');
const setup = (role: string | null = 'teacher') => {
  const repo = {
    entered: vi.fn().mockResolvedValue(role ? { role } : null),
    left: vi.fn().mockResolvedValue(undefined),
  };
  const live = { teacherEntered: vi.fn().mockResolvedValue(undefined) };
  const service = new RoomPresenceService(
    repo as unknown as RoomPresenceRepo,
    live as unknown as LessonLivePush,
  );
  return { repo, live, service };
};
const event = (
  kind: 'joined' | 'left',
  identity = 'teacher-0123456789ab',
  room = `lesson-${LESSON}`,
) => ({ kind, room, identity });

describe('RoomPresenceService', () => {
  it('the teacher coming in: inside now, and «بدأت الحلقة» to the family', async () => {
    const { repo, live, service } = setup();
    await service.record(event('joined'), NOW);
    expect(repo.entered).toHaveBeenCalledWith({
      lessonId: LESSON,
      identity: 'teacher-0123456789ab',
      at: NOW.toISOString(),
    });
    expect(live.teacherEntered).toHaveBeenCalledWith(LESSON);
  });

  it('anyone else coming in tells nobody; an identity we never admitted changes nothing', async () => {
    const guest = setup('guest');
    await guest.service.record(event('joined', 'guest-0123456789ab'), NOW);
    expect(guest.live.teacherEntered).not.toHaveBeenCalled();
    const unknown = setup(null);
    await unknown.service.record(event('joined'), NOW);
    expect(unknown.live.teacherEntered).not.toHaveBeenCalled();
  });

  it('leaving stamps left_at', async () => {
    const { repo, service } = setup();
    await service.record(event('left'), NOW);
    expect(repo.left).toHaveBeenCalledWith({
      lessonId: LESSON,
      identity: 'teacher-0123456789ab',
      at: NOW.toISOString(),
    });
  });

  it('a meeting room or an event without identity is not a lesson presence', async () => {
    const { repo, service } = setup();
    await service.record(event('joined', 'x', `meeting-${LESSON}`), NOW);
    await service.record(event('joined', ''), NOW);
    expect(repo.entered).not.toHaveBeenCalled();
  });

  it('never throws: the webhook must acknowledge', async () => {
    const { repo, service } = setup();
    repo.entered.mockRejectedValue(new Error('down'));
    await expect(service.record(event('joined'), NOW)).resolves.toBeUndefined();
  });
});
