import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ParticipantEvent } from '@/modules/teaching/classroom/livekit/livekit-webhook.room';
import { targetOfRoom } from '@/modules/teaching/classroom/recordings/recording-target';
import { LessonLivePush } from './lesson-live.push';
import { RoomPresenceRepo, type PresenceEvent } from './room-presence.repo';

/** The lesson behind a lesson room's event with an identity; null for a meeting or a bare event. */
function presenceOf(e: ParticipantEvent, now: Date): PresenceEvent | null {
  const target = targetOfRoom(e.room);
  if (target?.kind !== 'lesson' || e.identity === '') return null;
  return { lessonId: target.id, identity: e.identity, at: now.toISOString() };
}

/**
 * LiveKit's participant_joined / participant_left on a lesson room (owner 2026-11-16): who is
 * inside now (RoomPresenceRepo), and «بدأت الحلقة» to the family when the lesson's teacher comes
 * in. Never throws: the webhook must acknowledge, every failure is logged.
 */
@Injectable()
export class RoomPresenceService {
  private readonly log = new Logger(RoomPresenceService.name);
  private readonly apply: Record<ParticipantEvent['kind'], (e: PresenceEvent) => Promise<void>> = {
    joined: (e) => this.joined(e),
    left: (e) => this.presence.left(e),
  };

  constructor(
    @Inject(RoomPresenceRepo) private readonly presence: RoomPresenceRepo,
    @Inject(LessonLivePush) private readonly live: LessonLivePush,
  ) {}

  async record(event: ParticipantEvent, now: Date): Promise<void> {
    const e = presenceOf(event, now);
    if (!e) return;
    await this.apply[event.kind](e).catch((err: unknown) => {
      this.log.warn(`presence ${event.kind} ${event.room}: ${String(err)}`);
    });
  }

  private async joined(e: PresenceEvent): Promise<void> {
    const row = await this.presence.entered(e);
    if (row?.role === 'teacher') await this.live.teacherEntered(e.lessonId);
  }
}
