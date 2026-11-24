import { Injectable } from '@nestjs/common';
import { LivekitApi, LivekitError } from '@/modules/teaching/classroom/livekit/livekit-api';
import { ignoredAnswer, roomsAnswer } from '@/modules/teaching/classroom/livekit/livekit-twirp';
import { RecordingRepo } from '@/modules/teaching/classroom/recordings/recording.repo';
import { roomNameOf, type RoomTarget } from '@/modules/teaching/classroom/recordings/recording-target';
import { liveRooms, type LiveRoom } from './max-duration.rule';

/** A running recording is stopped first so its file is kept; every method throws on failure. */
@Injectable()
export class RoomCloser {
  constructor(
    private readonly livekit: LivekitApi,
    private readonly recordings: RecordingRepo,
  ) {}

  /** LIVEKIT_* are set (else the job only ends meetings in the database). */
  get configured(): boolean {
    return this.livekit.configured;
  }

  async list(): Promise<LiveRoom[]> {
    const method = 'livekit.RoomService/ListRooms';
    const grant = { roomList: true };
    const answer = await this.livekit.call({ method, body: {}, grant }, roomsAnswer);
    return liveRooms(answer);
  }

  /** true: the room was closed; false: it was already gone. */
  async close(target: RoomTarget, now: Date): Promise<boolean> {
    await this.stopRecording(target);
    return this.livekit.deleteRoom(roomNameOf(target), now);
  }

  private async stopRecording(target: RoomTarget): Promise<void> {
    const egressId = await this.recordings.runningEgress(target);
    if (!egressId) return;
    try {
      const method = 'livekit.Egress/StopEgress';
      const body = { egress_id: egressId };
      await this.livekit.call({ method, body, grant: { roomRecord: true } }, ignoredAnswer);
    } catch (e) {
      if (e instanceof LivekitError && e.code === 'not_found') return;
      throw e;
    }
  }
}
