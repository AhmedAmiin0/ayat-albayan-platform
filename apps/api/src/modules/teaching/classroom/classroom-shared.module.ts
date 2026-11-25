import { Module } from '@nestjs/common';
import { livekitEnv, loadEnv } from '@/config/env/env';
import { recordingEnv } from '@/config/env/env.recording';
import { TeachersModule } from '@/modules/people/teachers';
import {
  CLASSROOM_CONFIG,
  CLASSROOM_WEB_ORIGIN,
  FAMILY_JOIN_SECRET,
  firstWebOrigin,
  RECORDING_CONFIG,
  type ClassroomConfigSource,
  type RecordingConfig,
} from './classroom.config';
import { ClassroomRepo } from './classroom.repo';
import { ClassroomSettings } from './classroom.settings';
import { FamilyJoinLinks } from './family-link/family-join.links';
import { InternalMeetingsRepo } from './internal-meetings/internal-meetings.repo';
import { InternalMeetingsService } from './internal-meetings/internal-meetings.service';
import { PublicJoinLimit } from './join/join-limit';
import { LessonRoleService } from './join/lesson-role.service';
import { RoomAdmission } from './join/room-admission';
import { LIVEKIT_HTTP, LivekitApi } from './livekit/livekit-api';
import { ModerationRepo } from './moderation/moderation.repo';
import { RecordingRepo } from './recordings/recording.repo';
import { RecordingStarter } from './recordings/recording.starter';

/**
 * What two or more classroom feature modules inject: the LiveKit config and client, the lesson
 * role check, room admission (with its moderation and recording reads), the one public join
 * limit, the meeting reads and the family join links.
 */
@Module({
  imports: [TeachersModule],
  providers: [
    // Read per use: LIVEKIT_* may come from the database's integration config (no restart).
    {
      provide: CLASSROOM_CONFIG,
      useFactory: (): ClassroomConfigSource => () => livekitEnv(loadEnv()),
    },
    {
      provide: CLASSROOM_WEB_ORIGIN,
      useFactory: (): string => firstWebOrigin(loadEnv().WEB_ORIGIN),
    },
    { provide: RECORDING_CONFIG, useFactory: (): RecordingConfig => recordingEnv(loadEnv()) },
    { provide: FAMILY_JOIN_SECRET, useFactory: () => loadEnv().FEEDBACK_TOKEN_SECRET ?? null },
    // null: the http core's global fetch (tests bind a double).
    { provide: LIVEKIT_HTTP, useValue: null },
    { provide: PublicJoinLimit, useFactory: () => new PublicJoinLimit() },
    ...[ClassroomSettings, ClassroomRepo, LivekitApi, LessonRoleService, RoomAdmission],
    ...[ModerationRepo, RecordingRepo, RecordingStarter, InternalMeetingsRepo],
    ...[InternalMeetingsService, FamilyJoinLinks],
  ],
  exports: [
    ...[CLASSROOM_CONFIG, CLASSROOM_WEB_ORIGIN, PublicJoinLimit, ClassroomSettings, ClassroomRepo],
    ...[LivekitApi, LessonRoleService, RoomAdmission, ModerationRepo, RecordingRepo],
    ...[RecordingStarter, InternalMeetingsRepo, InternalMeetingsService, FamilyJoinLinks],
  ],
})
export class ClassroomSharedModule {}
