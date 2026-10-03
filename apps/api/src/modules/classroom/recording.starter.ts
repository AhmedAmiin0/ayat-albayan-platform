import { lessonRoomName } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RECORDING_CONFIG, type RecordingConfig } from './classroom.config';
import { egressIdOf, egressRequest, recordingPath } from './egress-request';
import { LivekitApi } from './livekit-api';
import { RecordingQueries } from './recording.queries';

export type StartOutcome = 'off' | 'running' | 'started' | 'failed';

/**
 * «الحلقة متسجلة كاملة»: a staff join starts the lesson's recording (LiveKit room-composite
 * egress) unless one is already running. The claim row comes first, so two joins at once start
 * one egress. Never throws: a failure lands in the row (status failed, error) and the join goes on.
 */
@Injectable()
export class RecordingStarter {
  private readonly log = new Logger(RecordingStarter.name);

  constructor(
    private readonly queries: RecordingQueries,
    private readonly livekit: LivekitApi,
    @Inject(RECORDING_CONFIG) private readonly s3: RecordingConfig,
  ) {}

  async startFor(lessonId: string, now = new Date()): Promise<StartOutcome> {
    if (!this.s3 || !this.livekit.configured) return 'off';
    const filePath = recordingPath(lessonId, now);
    let claim: string | null;
    try {
      claim = await this.queries.claim({ lessonId, filePath, startedAt: now.toISOString() });
    } catch (e) {
      this.log.warn(`recording claim failed for lesson ${lessonId}: ${messageOf(e)}`);
      return 'failed';
    }
    if (!claim) return 'running';
    return this.start({ id: claim, lessonId, filePath });
  }

  private async start(input: { id: string; lessonId: string; filePath: string }): Promise<StartOutcome> {
    const room = lessonRoomName(input.lessonId);
    try {
      if (!this.s3) return 'off';
      // An egress needs the room to exist; the joining staff member has not connected yet.
      await this.livekit.createRoom(room);
      const info = await this.livekit.call({
        method: 'livekit.Egress/StartRoomCompositeEgress',
        body: egressRequest({ room, filepath: input.filePath, s3: this.s3 }),
        grant: { roomRecord: true },
      });
      const egressId = egressIdOf(info);
      if (!egressId) throw new Error('no egress id in the answer');
      await this.queries.attachEgress(input.id, egressId);
      return 'started';
    } catch (e) {
      this.log.warn(`recording did not start for lesson ${input.lessonId}: ${messageOf(e)}`);
      await this.queries
        .finish(input.id, { status: 'failed', endedAt: new Date().toISOString(), error: messageOf(e).slice(0, 500) })
        .catch(() => undefined);
      return 'failed';
    }
  }
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));
