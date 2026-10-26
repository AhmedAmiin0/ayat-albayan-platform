import { Module } from '@nestjs/common';
import { livekitEnv, loadEnv } from '../../../config/env/env';
import { recordingEnv } from '../../../config/env/env.recording';
import { InboxModule } from '../../messaging/inbox/inbox.module';
import { TeachersModule } from '../../people/teachers/teachers.module';
import { AssistantsController } from './assistants/assistants.controller';
import { AssistantLessonsQueries } from './assistants/assistants.lessons';
import { AssistantsQueries } from './assistants/assistants.queries';
import { AssistantsService } from './assistants/assistants.service';
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
import { ClassroomSettings } from './classroom.settings';
import { GuestJoinService } from './join/guest-join.service';
import { INTERNAL_MEETING_CONTROLLERS, INTERNAL_MEETING_PROVIDERS } from './internal-meetings/internal-meetings.providers';
import { PublicJoinLimit } from './join/join-limit';
import { JoinLinkCopyService } from './join/join-link.copy.service';
import { JoinLinkService } from './join/join-link.service';
import { JoinLinkStaffService } from './join/join-link.staff.service';
import { KickService } from './moderation/kick.service';
import { LessonRoleService } from './join/lesson-role.service';
import { LIVEKIT_HTTP, LivekitApi, type HttpPost } from './livekit/livekit-api';
import { LivekitWebhookController } from './livekit/livekit-webhook.controller';
import { LivekitWebhookService } from './livekit/livekit-webhook.service';
import { ModerationController } from './moderation/moderation.controller';
import { ModerationQueries } from './moderation/moderation.queries';
import { MuteLimit } from './moderation/mute-limit';
import { LessonMuteController, MeetingMuteController } from './moderation/mute.controller';
import { MeetingMuteService, MuteService } from './moderation/mute.service';
import { MeetingRecordingListService, RecordingListService, RecordingViews } from './recordings/recording-list.service';
import { MeetingRecordingsController, RecordingStatusController } from './recordings/recordings.controller';
import { RecordingLifecycle } from './recordings/recording.lifecycle';
import { RecordingQueries } from './recordings/recording.queries';
import { RecordingStarter } from './recordings/recording.starter';
import { RoomAdmission } from './join/room-admission';
import { RoomJoinService } from './join/room-join.service';
import { RoomOpenController } from './join/room-open.controller';
import { RoomOpenService } from './join/room-open.service';
import { LessonShareController, MeetingShareController } from './moderation/share-grant.controller';
import { MeetingShareGrantService, ShareGrantService } from './moderation/share-grant.service';
import { StudentLinkAdminService } from './student-link/student-link.admin.service';
import { StudentLinkAdminController, StudentLinkPublicController } from './student-link/student-link.controller';
import { StudentLinkQueries } from './student-link/student-link.queries';
import { StudentLinkService } from './student-link/student-link.service';

/**
 * Online classrooms on the self-hosted LiveKit (docs/09, tools/livekit): staff join with their
 * login (POST /lessons/:id/room/join), the family with a one-lesson link (POST /public/join/:token,
 * sent by «ابعت لينك الحلقة» through the inbox Outbox), and the admin assigns teaching assistants
 * per student. Staff may remove someone from the room (blocked for that lesson), every lesson is
 * recorded (LiveKit egress into the `recordings` bucket, POST /livekit/webhook). Staff may open the room
 * early (POST /lessons/:id/room/open) and a student has a long-lived link (/public/student/:token). «اجتماع داخلي» is a
 * standalone room with no lesson (/meetings, /public/meetings/:token), instant or scheduled with invitees (R-MEET-01..03). TemplateRegistry comes from the global WhatsappModule.
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
    ...INTERNAL_MEETING_CONTROLLERS,
  ],
  providers: [
    // Read per use: LIVEKIT_* may come from the database's integration config (no restart).
    { provide: CLASSROOM_CONFIG, useFactory: (): ClassroomConfigSource => () => livekitEnv(loadEnv()) },
    { provide: CLASSROOM_WEB_ORIGIN, useFactory: (): string => firstWebOrigin(loadEnv().WEB_ORIGIN) },
    { provide: RECORDING_CONFIG, useFactory: (): RecordingConfig => recordingEnv(loadEnv()) },
    { provide: LIVEKIT_HTTP, useValue: ((url, init) => fetch(url, init)) satisfies HttpPost },
    { provide: PublicJoinLimit, useFactory: () => new PublicJoinLimit() },
    { provide: MuteLimit, useFactory: () => new MuteLimit() },
    ClassroomSettings,
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
    ...INTERNAL_MEETING_PROVIDERS,
  ],
  // The student file's recordings (modules/student-recordings) sign links and read rows the same way; the
  // family portal (modules/people/portal) hands out the same guest link.
  exports: [RecordingViews, RecordingQueries, JoinLinkCopyService],
})
export class ClassroomModule {}
