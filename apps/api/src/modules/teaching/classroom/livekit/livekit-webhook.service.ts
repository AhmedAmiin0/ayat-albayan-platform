import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CLASSROOM_CONFIG, classroomConfigOf, type ClassroomConfigSource } from '../classroom.config';
import { egressOutcome, verifyWebhook } from './livekit-webhook';
import { leftEventOf } from './livekit-webhook.room';
import { RecordingLifecycle } from '../recordings/recording.lifecycle';
import { RecordingQueries } from '../recordings/recording.queries';

export interface WebhookPost {
  /** The exact bytes LiveKit sent. */
  rawBody: Buffer | undefined;
  authorization: string | undefined;
}

/**
 * POST /livekit/webhook: LiveKit's events. 401 (nothing changes) unless signed by our API secret
 * over these bytes. An egress ending marks the recording done or failed (and records again if
 * people are still in the room); a participant leaving an emptied room stops its recording. Every
 * other event, and an egress we never started, is acknowledged and ignored so LiveKit does not retry.
 */
@Injectable()
export class LivekitWebhookService {
  constructor(
    @Inject(CLASSROOM_CONFIG) private readonly source: ClassroomConfigSource,
    private readonly recordings: RecordingQueries,
    private readonly lifecycle: RecordingLifecycle,
  ) {}

  async handle(post: WebhookPost, now = new Date()): Promise<void> {
    const config = classroomConfigOf(this.source);
    if (!config || !verifyWebhook({ ...post, config, now })) throw new UnauthorizedException();
    const event = parse(post.rawBody);
    const left = leftEventOf(event);
    if (left) {
      await this.lifecycle.afterLeft(left);
      return;
    }
    const outcome = egressOutcome(event, now);
    if (!outcome) return;
    const { egressId, status, endedAt, error, sizeBytes } = outcome;
    await this.recordings.finishByEgress(egressId, { status, endedAt, error, ...(sizeBytes !== undefined && { sizeBytes }) });
    await this.lifecycle.afterEgressEnded({ room: outcome.room, status: outcome.status });
  }
}

function parse(raw: Buffer | undefined): unknown {
  try {
    return JSON.parse(raw?.toString('utf8') ?? '');
  } catch {
    return null;
  }
}
