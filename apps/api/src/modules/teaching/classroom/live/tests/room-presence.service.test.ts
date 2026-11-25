import { describe, expect, it, vi } from 'vitest';
import type { ParticipantEvent } from '@/modules/teaching/classroom/livekit/livekit-webhook.room';
import type { LessonLivePush } from '@/modules/teaching/classroom/live/lesson-live.push';
import type { RoomPresenceRepo } from '@/modules/teaching/classroom/live/room-presence.repo';
import { RoomPresenceService } from '@/modules/teaching/classroom/live/room-presence.service';

const LESSON = '00000000-0000-4000-8000-0000000000d1';
const NOW = new Date('2026-11-16T10:00:00.000Z');
const SENT = '2026-11-16T09:59:50.000Z';
const setup = (role: string | null = 'teacher') => {
  const repo = {
    entered: vi.fn().mockResolvedValue(role ? { role } : null),
    left: vi.fn().mockResolvedValue(undefined),
    leaveAll: vi.fn().mockResolvedValue(undefined),
  };
  const live = { teacherEntered: vi.fn().mockResolvedValue(undefined) };
  const asRepo = repo as unknown as RoomPresenceRepo;
  const service = new RoomPresenceService(asRepo, live as unknown as LessonLivePush);
  return { repo, live, service };
};
const event = (over: Partial<ParticipantEvent> = {}): ParticipantEvent => ({
  kind: 'joined',
  room: `lesson-${LESSON}`,
  identity: 'teacher-0123456789ab',
  at: SENT,
  ...over,
});
const at = (when: string) => ({ lessonId: LESSON, identity: 'teacher-0123456789ab', at: when });

describe('RoomPresenceService', () => {
  it("the teacher coming in, at the event's own time, tells the family «بدأت الحلقة»", async () => {
    const { repo, live, service } = setup();
    await service.record(event(), NOW);
    expect(repo.entered).toHaveBeenCalledWith(at(SENT));
    expect(live.teacherEntered).toHaveBeenCalledWith(LESSON);
  });

  it('the receipt time only when LiveKit sent no createdAt', async () => {
    const { repo, service } = setup();
    await service.record(event({ at: null }), NOW);
    expect(repo.entered).toHaveBeenCalledWith(at(NOW.toISOString()));
  });

  it('a guest, an unknown or a stale (older) join tells nobody', async () => {
    const guest = setup('guest');
    await guest.service.record(event({ identity: 'guest-0123456789ab' }), NOW);
    expect(guest.live.teacherEntered).not.toHaveBeenCalled();
    const stale = setup(null);
    await stale.service.record(event(), NOW);
    expect(stale.live.teacherEntered).not.toHaveBeenCalled();
  });

  it('leaving stamps left_at; room_finished takes everyone out', async () => {
    const { repo, service } = setup();
    await service.record(event({ kind: 'left' }), NOW);
    expect(repo.left).toHaveBeenCalledWith(at(SENT));
    await service.record(event({ kind: 'finished', identity: '' }), NOW);
    expect(repo.leaveAll).toHaveBeenCalledWith(LESSON, SENT);
  });

  it('a meeting room, or a participant event without identity, is not a lesson presence', async () => {
    const { repo, service } = setup();
    await service.record(event({ room: `meeting-${LESSON}` }), NOW);
    await service.record(event({ identity: '' }), NOW);
    expect(repo.entered).not.toHaveBeenCalled();
  });

  it('never throws: the webhook must acknowledge', async () => {
    const { repo, service } = setup();
    repo.entered.mockRejectedValue(new Error('down'));
    await expect(service.record(event(), NOW)).resolves.toBeUndefined();
  });
});
