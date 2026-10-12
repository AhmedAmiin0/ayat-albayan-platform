import { Module } from '@nestjs/common';
import { livekitEnv, loadEnv } from '../../env';
import { recordingEnv } from '../../env.recording';
import { InboxModule } from '../inbox/inbox.module';
import { TeachersModule } from '../teachers/teachers.module';
import { AssistantsController } from './assistants.controller';
import { AssistantLessonsQueries } from './assistants.lessons';
import { AssistantsQueries } from './assistants.queries';
import { AssistantsService } from './assistants.service';
import {
  CLASSROOM_CONFIG,
  CLASSROOM_WEB_ORIGIN,
  firstWebOrigin,
  RECORDING_CONFIG,
  type ClassroomConfigSource,
  type RecordingConfig,
} from './classroom.config';
import { ClassroomController, JoinLinkStaffController } from './classroom.controller';
import { ClassroomPublicController } from './classroom.public.controller';
import { ClassroomQueries } from './classroom.queries';
import { GuestJoinService } from './guest-join.service';
import { InternalMeetingsController, InternalMeetingsPublicController } from './internal-meetings.controller';
import { InternalMeetingJoinService } from './internal-meetings.join.service';
import { InternalMeetingKickService } from './internal-meetings.kick.service';
import { InternalMeetingsQueries } from './internal-meetings.queries';
import { InternalMeetingsService } from './internal-meetings.service';
import { PublicJoinLimit } from './join-limit';
import { JoinLinkCopyService } from './join-link.copy.service';
import { JoinLinkService } from './join-link.service';
import { JoinLinkStaffService } from './join-link.staff.service';
import { KickService } from './kick.service';
import { LessonRoleService } from './lesson-role.service';
import { LIVEKIT_HTTP, LivekitApi, type HttpPost } from './livekit-api';
import { LivekitWebhookController } from './livekit-webhook.controller';
import { LivekitWebhookService } from './livekit-webhook.service';
import { ModerationController } from './moderation.controller';
import { ModerationQueries } from './moderation.queries';
import { MuteLimit } from './mute-limit';
import { LessonMuteController, MeetingMuteController } from './mute.controller';
import { MeetingMuteService, MuteService } from './mute.service';
import { MeetingRecordingListService, RecordingListService, RecordingViews } from './recording-list.service';
import { MeetingRecordingsController, RecordingStatusController } from './recordings.controller';
import { RecordingLifecycle } from './recording.lifecycle';
import { RecordingQueries } from './recording.queries';
import { RecordingStarter } from './recording.starter';
import { RoomAdmission } from './room-admission';
import { RoomJoinService } from './room-join.service';
import { RoomOpenController } from './room-open.controller';
import { RoomOpenService } from './room-open.service';
import { LessonShareController, MeetingShareController } from './share-grant.controller';
import { MeetingShareGrantService, ShareGrantService } from './share-grant.service';
import { StudentLinkAdminService } from './student-link.admin.service';
import { StudentLinkAdminController, StudentLinkPublicController } from './student-link.controller';
import { StudentLinkQueries } from './student-link.queries';
import { StudentLinkService } from './student-link.service';

/**
 * Online classrooms on the self-hosted LiveKit (docs/09, tools/livekit): staff join with their
 * login (POST /lessons/:id/room/join), the family with a one-lesson link (POST /public/join/:token,
 * sent by «ابعت لينك الحلقة» through the inbox Outbox), and the admin assigns teaching assistants
 * per student. Staff may remove someone from the room (blocked for that lesson), every lesson is
 * recorded (LiveKit egress into the `recordings` bucket, POST /livekit/webhook). Staff may open the room
 * early (POST /lessons/:id/room/open) and a student has a long-lived link (/public/student/:token). «اجتماع داخلي» is a
 * standalone room with no lesson (/meetings, /public/meetings/:token). TemplateRegistry comes from the global WhatsappModule.
 */
@Module({
  imports: [InboxModule, TeachersModule],
  controllers: [
    ClassroomController,
    JoinLinkStaffController,
    LessonShareController,
    MeetingShareController,
    LessonMuteController,
    MeetingRecordingsController,
    RecordingStatusController,
    MeetingMuteController,
    ClassroomPublicController,
    AssistantsController,
    ModerationController,
    LivekitWebhookController,
    RoomOpenController,
    StudentLinkPublicController,
    StudentLinkAdminController,
    InternalMeetingsController,
    InternalMeetingsPublicController,
  ],
  providers: [
    // Read per use: LIVEKIT_* may come from the database's integration config (no restart).
    { provide: CLASSROOM_CONFIG, useFactory: (): ClassroomConfigSource => () => livekitEnv(loadEnv()) },
    { provide: CLASSROOM_WEB_ORIGIN, useFactory: (): string => firstWebOrigin(loadEnv().WEB_ORIGIN) },
    { provide: RECORDING_CONFIG, useFactory: (): RecordingConfig => recordingEnv(loadEnv()) },
    { provide: LIVEKIT_HTTP, useValue: ((url, init) => fetch(url, init)) satisfies HttpPost },
    { provide: PublicJoinLimit, useFactory: () => new PublicJoinLimit() },
    { provide: MuteLimit, useFactory: () => new MuteLimit() },
    ClassroomQueries,
    AssistantsQueries,
    AssistantLessonsQueries,
    RoomJoinService,
    RoomOpenService,
    StudentLinkQueries,
    StudentLinkService,
    StudentLinkAdminService,
    GuestJoinService,
    JoinLinkService,
    JoinLinkStaffService,
    ShareGrantService,
    MeetingShareGrantService,
    MuteService,
    MeetingMuteService,
    JoinLinkCopyService,
    AssistantsService,
    LessonRoleService,
    ModerationQueries,
    RecordingQueries,
    LivekitApi,
    RecordingStarter,
    RecordingLifecycle,
    RoomAdmission,
    KickService,
    RecordingListService,
    RecordingViews,
    MeetingRecordingListService,
    LivekitWebhookService,
    InternalMeetingsQueries,
    InternalMeetingsService,
    InternalMeetingJoinService,
    InternalMeetingKickService,
  ],
  // The student file's recordings (modules/student-recordings) sign links and read rows the same way.
  exports: [RecordingViews, RecordingQueries],
})
export class ClassroomModule {}
