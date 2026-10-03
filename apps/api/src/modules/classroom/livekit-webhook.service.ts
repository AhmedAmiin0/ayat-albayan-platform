import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CLASSROOM_CONFIG, type ClassroomConfig } from './classroom.config';
import { egressOutcome, verifyWebhook } from './livekit-webhook';
import { RecordingQueries } from './recording.queries';

export interface WebhookPost {
  /** The exact bytes LiveKit sent. */
  rawBody: Buffer | undefined;
  authorization: string | undefined;
}

/**
 * POST /livekit/webhook: LiveKit's events. 401 (nothing changes) unless signed by our API secret
 * over these bytes. Only egress endings matter (the recording is done or failed); every other
 * event, and an egress we never started, is acknowledged and ignored so LiveKit does not retry.
 */
@Injectable()
export class LivekitWebhookService {
  constructor(
    @Inject(CLASSROOM_CONFIG) private readonly config: ClassroomConfig,
    private readonly recordings: RecordingQueries,
  ) {}

  async handle(post: WebhookPost, now = new Date()): Promise<void> {
    if (!this.config || !verifyWebhook({ ...post, config: this.config, now })) throw new UnauthorizedException();
    const outcome = egressOutcome(parse(post.rawBody), now);
    if (!outcome) return;
    await this.recordings.finishByEgress(outcome.egressId, { status: outcome.status, endedAt: outcome.endedAt, error: outcome.error });
  }
}

function parse(raw: Buffer | undefined): unknown {
  try {
    return JSON.parse(raw?.toString('utf8') ?? '');
  } catch {
    return null;
  }
}
