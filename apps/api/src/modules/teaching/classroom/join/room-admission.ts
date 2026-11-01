import { lessonRoomName, type JoinRole, type RoomJoinResult } from '@ab/shared';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type { LivekitEnv } from '@/config/env/env';
import { CLASSROOM_CONFIG, classroomConfigOf, type ClassroomConfigSource } from '@/modules/teaching/classroom/classroom.config';
import { notConfigured } from './join-gate';
import { mintToken, newIdentity } from '@/modules/teaching/classroom/livekit/livekit-token';
import { ModerationRepo, principalColumns, type Principal } from '@/modules/teaching/classroom/moderation/moderation.repo';
import { RecordingStarter } from '@/modules/teaching/classroom/recordings/recording.starter';
import { lessonTarget, type RoomTarget } from '@/modules/teaching/classroom/recordings/recording-target';

interface Admission {
  lessonId: string;
  role: JoinRole;
  name: string;
  principal: Principal;
  ttlSeconds?: number;
}

/** 403 removed_from_room: this login or link was removed from the lesson's room. */
const removedFromRoom = (): HttpException =>
  new HttpException({ code: 'removed_from_room', message: 'removed_from_room' }, HttpStatus.FORBIDDEN);

/**
 * The last step of every join, staff and guest alike, once the caller is known to belong: refuse
 * a removed principal, tell a trial lesson's room it has no text chat, mint the token (fresh identity), record the participant (a removal finds
 * them by identity), and make sure the lesson is being recorded.
 */
@Injectable()
export class RoomAdmission {
  private readonly log = new Logger(RoomAdmission.name);

  constructor(
    @Inject(CLASSROOM_CONFIG) private readonly source: ClassroomConfigSource,
    private readonly moderation: ModerationRepo,
    private readonly recorder: RecordingStarter,
  ) {}

  /** 503 classroom_not_configured when LIVEKIT_* are not set. */
  livekit(): LivekitEnv {
    const config = classroomConfigOf(this.source);
    if (!config) throw notConfigured();
    return config;
  }

  async admit(input: Admission, now: Date): Promise<RoomJoinResult> {
    const config = this.livekit();
    const [blocked, trial] = await Promise.all([
      this.moderation.isBlocked(input.lessonId, input.principal),
      this.moderation.isTrialLesson(input.lessonId),
    ]);
    if (blocked) throw removedFromRoom();
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
    this.record(lessonTarget(input.lessonId), now);
    // chat: false in a trial lesson; the clients hide and drop the text chat (tools/livekit/README.md).
    return { url: config.url, token, room, role: input.role, recording: this.recordingState, chat: !trial };
  }

  /** 'off' when RECORDING_S3_* or LiveKit are missing: the room warns the admin. */
  get recordingState(): 'on' | 'off' {
    return this.recorder.configured ? 'on' : 'off';
  }

  /**
   * Any join (staff or guest, lesson or meeting) makes sure the room is being recorded; idempotent
   * (one running row per room). Fire and forget: the join never waits for (or fails on) it.
   */
  record(target: RoomTarget, now: Date): void {
    this.recorder.startFor(target, now).catch((e: unknown) => this.log.warn(`recording: ${String(e)}`));
  }
}
