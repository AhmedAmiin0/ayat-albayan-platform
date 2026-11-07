import { MINIO_MARK, storageKeyOf } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { BUCKETS } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { RECORDING_CONFIG, type RecordingConfig } from '@/modules/teaching/classroom/classroom.config';
import { egressIdOf, egressRequest, recordingPath } from '@/modules/teaching/classroom/livekit/egress-request';
import { LivekitApi } from '@/modules/teaching/classroom/livekit/livekit-api';
import { egressAnswer } from '@/modules/teaching/classroom/livekit/livekit-twirp';
import { RecordingRepo } from './recording.repo';
import { roomNameOf, type RoomTarget } from './recording-target';

type StartOutcome = 'off' | 'running' | 'started' | 'failed';

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
    private readonly queries: RecordingRepo,
    private readonly livekit: LivekitApi,
    @Inject(RECORDING_CONFIG) private readonly s3: RecordingConfig,
    private readonly storage: StorageService,
  ) {}

  /**
   * LIVEKIT_* and a place to upload to: RECORDING_S3_* (Supabase), or MinIO only with its own
   * switch (MINIO_RECORDINGS on and the driver on minio, docs/45 §1): STORAGE_DRIVER=minio alone
   * never starts recording onto the shared disk. Whether LiveKit runs Egress shows at first start.
   */
  get configured(): boolean {
    return (this.s3 !== null || this.storage.recordsToMinio()) && this.livekit.configured;
  }

  /** Where this recording goes: MinIO (its row keeps the «minio:» path) or RECORDING_S3_*. */
  private where(key: string): { s3: RecordingConfig; filePath: string } {
    const minio = this.storage.egressTarget(BUCKETS.recordings);
    return minio ? { s3: minio, filePath: `${MINIO_MARK}${key}` } : { s3: this.s3, filePath: key };
  }

  async startFor(target: RoomTarget, now = new Date()): Promise<StartOutcome> {
    if (!this.configured) return 'off';
    let filePath: string;
    let s3: RecordingConfig;
    let claim: string | null;
    try {
      ({ s3, filePath } = this.where(recordingPath(target, now)));
      claim = await this.queries.claim({ target, filePath, startedAt: now.toISOString() });
    } catch (e) {
      this.log.warn(`recording claim failed for ${roomNameOf(target)}: ${messageOf(e)}`);
      return 'failed';
    }
    if (!claim) return 'running';
    return this.start({ id: claim, room: roomNameOf(target), filePath, s3 });
  }

  private async start(input: { id: string; room: string; filePath: string; s3: RecordingConfig }): Promise<StartOutcome> {
    const { room, s3 } = input;
    try {
      if (!s3) return 'off';
      // An egress needs the room to exist; the joining staff member has not connected yet.
      await this.livekit.createRoom(room);
      const info = await this.livekit.call(
        {
          method: 'livekit.Egress/StartRoomCompositeEgress',
          body: egressRequest({ room, filepath: storageKeyOf(input.filePath), s3 }),
          grant: { roomRecord: true },
        },
        egressAnswer,
      );
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
