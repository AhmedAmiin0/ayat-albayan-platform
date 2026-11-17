import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CLASSROOM_CONFIG, classroomConfigOf, type ClassroomConfigSource } from '@/modules/teaching/classroom/classroom.config';
import { egressOutcome, verifyWebhook } from './livekit-webhook';
import { participantEventOf, type ParticipantEvent } from './livekit-webhook.room';
import { RoomPresenceService } from '@/modules/teaching/classroom/live/room-presence.service';
import { RecordingLifecycle } from '@/modules/teaching/classroom/recordings/recording.lifecycle';
import { RecordingRepo } from '@/modules/teaching/classroom/recordings/recording.repo';

interface WebhookPost {
  /** The exact bytes LiveKit sent. */
  rawBody: Buffer | undefined;
  authorization: string | undefined;
}

/**
 * POST /livekit/webhook: LiveKit's events. 401 (nothing changes) unless signed by our API secret
 * over these bytes. An egress ending marks the recording done or failed (and records again if
 * people are still in the room); a participant joining or leaving a lesson room is who is
 * inside now (RoomPresenceService, «بدأت الحلقة» when the teacher comes in); a participant leaving
 * an emptied room stops its recording. Every
 * other event, and an egress we never started, is acknowledged and ignored so LiveKit does not retry.
 */
@Injectable()
export class LivekitWebhookService {
  constructor(
    @Inject(CLASSROOM_CONFIG) private readonly source: ClassroomConfigSource,
    private readonly recordings: RecordingRepo,
    private readonly lifecycle: RecordingLifecycle,
    @Inject(RoomPresenceService) private readonly presence: RoomPresenceService,
  ) {}

  async handle(post: WebhookPost, now = new Date()): Promise<void> {
    const config = classroomConfigOf(this.source);
    if (!config || !verifyWebhook({ ...post, config, now })) throw new UnauthorizedException();
    const event = parse(post.rawBody);
    const moved = participantEventOf(event);
    if (moved) return this.participant(moved, now);
    const outcome = egressOutcome(event, now);
    if (!outcome) return;
    const { egressId, status, endedAt, error, sizeBytes } = outcome;
    await this.recordings.finishByEgress(egressId, { status, endedAt, error, ...(sizeBytes !== undefined && { sizeBytes }) });
    await this.lifecycle.afterEgressEnded({ room: outcome.room, status: outcome.status });
  }

  /** Who is inside now; a leaving participant may also stop the emptied room's recording. */
  private async participant(moved: ParticipantEvent, now: Date): Promise<void> {
    await this.presence.record(moved, now);
    if (moved.kind === 'left') await this.lifecycle.afterLeft(moved);
  }
}

function parse(raw: Buffer | undefined): unknown {
  try {
    return JSON.parse(raw?.toString('utf8') ?? '');
  } catch {
    return null;
  }
}
