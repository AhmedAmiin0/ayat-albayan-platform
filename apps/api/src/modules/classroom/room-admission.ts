import { lessonRoomName, type JoinRole, type RoomJoinResult } from '@ab/shared';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type { LivekitEnv } from '../../env';
import { CLASSROOM_CONFIG, type ClassroomConfig } from './classroom.config';
import { notConfigured } from './join-gate';
import { mintToken, newIdentity } from './livekit-token';
import { ModerationQueries, principalColumns, type Principal } from './moderation.queries';
import { RecordingStarter } from './recording.starter';

export interface Admission {
  lessonId: string;
  role: JoinRole;
  name: string;
  principal: Principal;
  ttlSeconds?: number;
}

/** 403 removed_from_room: this login or link was removed from the lesson's room. */
export const removedFromRoom = (): HttpException =>
  new HttpException({ code: 'removed_from_room', message: 'removed_from_room' }, HttpStatus.FORBIDDEN);

/**
 * The last step of every join, staff and guest alike, once the caller is known to belong: refuse
 * a removed principal, mint the token (fresh identity), record the participant (a removal finds
 * them by identity), and on a staff join make sure the lesson is being recorded.
 */
@Injectable()
export class RoomAdmission {
  private readonly log = new Logger(RoomAdmission.name);

  constructor(
    @Inject(CLASSROOM_CONFIG) private readonly config: ClassroomConfig,
    private readonly moderation: ModerationQueries,
    private readonly recorder: RecordingStarter,
  ) {}

  /** 503 classroom_not_configured when LIVEKIT_* are not set. */
  livekit(): LivekitEnv {
    if (!this.config) throw notConfigured();
    return this.config;
  }

  async admit(input: Admission, now: Date): Promise<RoomJoinResult> {
    const config = this.livekit();
    if (await this.moderation.isBlocked(input.lessonId, input.principal)) throw removedFromRoom();
    const room = lessonRoomName(input.lessonId);
    const identity = newIdentity(input.role);
    const token = mintToken(config, { room, role: input.role, name: input.name, identity, ttlSeconds: input.ttlSeconds }, now);
    await this.moderation.addParticipant({
      lesson_id: input.lessonId,
      identity,
      role: input.role,
      name: input.name,
      joined_at: now.toISOString(),
      ...principalColumns(input.principal),
    });
    if (input.role !== 'guest') this.record(input.lessonId, now);
    return { url: config.url, token, room, role: input.role };
  }

  /** Fire and forget: the join never waits for (or fails on) the recording. */
  private record(lessonId: string, now: Date): void {
    this.recorder.startFor(lessonId, now).catch((e: unknown) => this.log.warn(`recording: ${String(e)}`));
  }
}
