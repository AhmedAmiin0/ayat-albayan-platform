import { Injectable, Logger } from '@nestjs/common';
import { LivekitApi } from './livekit-api';
import { peopleIn } from './livekit-webhook.room';
import { RecordingQueries } from './recording.queries';
import { RecordingStarter } from './recording.starter';
import { targetOfRoom } from './recording-target';

/**
 * Keeps «every room recorded» true between joins, driven by LiveKit's webhook: an egress that
 * ended while people are still in the room (a crash, a limit) is started again; the last person
 * leaving stops the running egress, so an empty room is not recorded. Never throws (the webhook
 * must acknowledge), every failure is logged.
 */
@Injectable()
export class RecordingLifecycle {
  private readonly log = new Logger(RecordingLifecycle.name);

  constructor(
    private readonly livekit: LivekitApi,
    private readonly queries: RecordingQueries,
    private readonly starter: RecordingStarter,
  ) {}

  /**
   * After an egress ended normally (complete, limit reached): record again if anyone is still there.
   * A failed egress is not retried, so a broken recorder cannot loop (the row shows «فشل التسجيل»;
   * the next join tries again).
   */
  async afterEgressEnded(input: { room: string | null; status: 'done' | 'failed' }): Promise<'restarted' | 'idle'> {
    const { room } = input;
    const target = targetOfRoom(room);
    if (input.status !== 'done' || !target || !room || !this.starter.configured) return 'idle';
    try {
      if ((await this.people(room)).length === 0) return 'idle';
      return (await this.starter.startFor(target)) === 'started' ? 'restarted' : 'idle';
    } catch (e) {
      this.log.warn(`recording restart check failed for ${room}: ${String(e)}`);
      return 'idle';
    }
  }

  /** After participant_left: stop the room's running egress once nobody is left. */
  async afterLeft(input: { room: string; identity: string }): Promise<'stopped' | 'idle'> {
    const target = targetOfRoom(input.room);
    if (!target || !this.livekit.configured) return 'idle';
    try {
      if ((await this.people(input.room, input.identity)).length > 0) return 'idle';
      const egressId = await this.queries.runningEgress(target);
      if (!egressId) return 'idle';
      await this.livekit.call({ method: 'livekit.Egress/StopEgress', body: { egress_id: egressId }, grant: { roomRecord: true } });
      return 'stopped';
    } catch (e) {
      this.log.warn(`recording stop failed for ${input.room}: ${String(e)}`);
      return 'idle';
    }
  }

  private async people(room: string, except = ''): Promise<string[]> {
    const answer = await this.livekit.call({ method: 'livekit.RoomService/ListParticipants', body: { room }, grant: { roomAdmin: true, room } });
    return peopleIn(answer, except);
  }
}
