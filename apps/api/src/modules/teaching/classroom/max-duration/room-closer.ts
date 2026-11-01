import { Injectable } from '@nestjs/common';
import { LivekitApi, LivekitError } from '@/modules/teaching/classroom/livekit/livekit-api';
import { RecordingRepo } from '@/modules/teaching/classroom/recordings/recording.repo';
import { roomNameOf, type RoomTarget } from '@/modules/teaching/classroom/recordings/recording-target';
import { liveRooms, type LiveRoom } from './max-duration.rule';

/**
 * The LiveKit side of MeetingMaxDurationJob: lists the rooms, and closes one the way «إنهاء» does
 * (DeleteRoom). A running recording is stopped first, like the last person leaving
 * (RecordingLifecycle), so its file is finished and kept. Every method throws on a failure.
 */
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
    return liveRooms(await this.livekit.call({ method, body: {}, grant: { roomList: true } }));
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
      await this.livekit.call({ method, body, grant: { roomRecord: true } });
    } catch (e) {
      if (e instanceof LivekitError && e.code === 'not_found') return;
      throw e;
    }
  }
}
