import { Inject, Injectable, Logger } from '@nestjs/common';
import { RECORDING_CONFIG, type RecordingConfig } from './classroom.config';
import { egressIdOf, egressRequest, recordingPath } from './egress-request';
import { LivekitApi } from './livekit-api';
import { RecordingQueries } from './recording.queries';
import { roomNameOf, type RoomTarget } from './recording-target';

export type StartOutcome = 'off' | 'running' | 'started' | 'failed';

/**
 * Every room is recorded in full (lessons and internal meetings): any join starts the room's
 * recording (LiveKit room-composite egress) unless one is already running. The claim row comes
 * first, so two joins at once start one egress. Never throws: a failure lands in the row (status
 * failed, error) and the join goes on.
 */
@Injectable()
export class RecordingStarter {
  private readonly log = new Logger(RecordingStarter.name);

  constructor(
    private readonly queries: RecordingQueries,
    private readonly livekit: LivekitApi,
    @Inject(RECORDING_CONFIG) private readonly s3: RecordingConfig,
  ) {}

  /** RECORDING_S3_* and LIVEKIT_* are set (whether LiveKit runs Egress shows on the first start). */
  get configured(): boolean {
    return this.s3 !== null && this.livekit.configured;
  }

  async startFor(target: RoomTarget, now = new Date()): Promise<StartOutcome> {
    if (!this.configured) return 'off';
    const filePath = recordingPath(target, now);
    let claim: string | null;
    try {
      claim = await this.queries.claim({ target, filePath, startedAt: now.toISOString() });
    } catch (e) {
      this.log.warn(`recording claim failed for ${roomNameOf(target)}: ${messageOf(e)}`);
      return 'failed';
    }
    if (!claim) return 'running';
    return this.start({ id: claim, room: roomNameOf(target), filePath });
  }

  private async start(input: { id: string; room: string; filePath: string }): Promise<StartOutcome> {
    const { room } = input;
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
      this.log.warn(`recording did not start for ${room}: ${messageOf(e)}`);
      await this.queries
        .finish(input.id, { status: 'failed', endedAt: new Date().toISOString(), error: messageOf(e).slice(0, 500) })
        .catch(() => undefined);
      return 'failed';
    }
  }
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));
