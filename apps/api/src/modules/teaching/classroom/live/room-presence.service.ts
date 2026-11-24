import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ParticipantEvent } from '@/modules/teaching/classroom/livekit/livekit-webhook.room';
import { targetOfRoom } from '@/modules/teaching/classroom/recordings/recording-target';
import { LessonLivePush } from './lesson-live.push';
import { RoomPresenceRepo, type PresenceEvent } from './room-presence.repo';

/** A participant's event names who; room_finished names the room only. */
const NEEDS_IDENTITY: Readonly<Record<ParticipantEvent['kind'], boolean>> = {
  joined: true,
  left: true,
  finished: false,
};

const missingWho = (e: ParticipantEvent): boolean => NEEDS_IDENTITY[e.kind] && e.identity === '';

/**
 * The lesson behind a lesson room's event, at the event's own time (the receipt time only when
 * LiveKit sent none); null for a meeting, or a participant event without an identity.
 */
function presenceOf(e: ParticipantEvent, now: Date): PresenceEvent | null {
  const target = targetOfRoom(e.room);
  if (target?.kind !== 'lesson' || missingWho(e)) return null;
  return { lessonId: target.id, identity: e.identity, at: e.at ?? now.toISOString() };
}

/** Never throws: the webhook must acknowledge. */
@Injectable()
export class RoomPresenceService {
  private readonly log = new Logger(RoomPresenceService.name);
  private readonly apply: Record<ParticipantEvent['kind'], (e: PresenceEvent) => Promise<void>> = {
    joined: (e) => this.joined(e),
    left: (e) => this.presence.left(e),
    finished: (e) => this.presence.leaveAll(e.lessonId, e.at),
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
