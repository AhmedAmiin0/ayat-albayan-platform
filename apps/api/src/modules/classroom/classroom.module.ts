import { Module } from '@nestjs/common';
import { livekitEnv, loadEnv } from '../../env';
import { recordingEnv } from '../../env.recording';
import { InboxModule } from '../inbox/inbox.module';
import { TeachersModule } from '../teachers/teachers.module';
import { AssistantsController } from './assistants.controller';
import { AssistantLessonsQueries } from './assistants.lessons';
import { AssistantsQueries } from './assistants.queries';
import { AssistantsService } from './assistants.service';
import { CLASSROOM_CONFIG, CLASSROOM_WEB_ORIGIN, RECORDING_CONFIG, type ClassroomConfig, type RecordingConfig } from './classroom.config';
import { ClassroomController } from './classroom.controller';
import { ClassroomPublicController } from './classroom.public.controller';
import { ClassroomQueries } from './classroom.queries';
import { GuestJoinService } from './guest-join.service';
import { PublicJoinLimit } from './join-limit';
import { JoinLinkCopyService } from './join-link.copy.service';
import { JoinLinkService } from './join-link.service';
import { KickService } from './kick.service';
import { LessonRoleService } from './lesson-role.service';
import { LIVEKIT_HTTP, LivekitApi, type HttpPost } from './livekit-api';
import { LivekitWebhookController } from './livekit-webhook.controller';
import { LivekitWebhookService } from './livekit-webhook.service';
import { ModerationController } from './moderation.controller';
import { ModerationQueries } from './moderation.queries';
import { RecordingListService } from './recording-list.service';
import { RecordingQueries } from './recording.queries';
import { RecordingStarter } from './recording.starter';
import { RoomAdmission } from './room-admission';
import { RoomJoinService } from './room-join.service';

/**
 * Online classrooms on the self-hosted LiveKit (docs/09, tools/livekit): staff join with their
 * login (POST /lessons/:id/room/join), the family with a one-lesson link (POST /public/join/:token,
 * sent by «ابعت لينك الحلقة» through the inbox Outbox), and the admin assigns teaching assistants
 * per student. Staff may remove someone from the room (blocked for that lesson), every lesson is
 * recorded (LiveKit egress into the `recordings` bucket, POST /livekit/webhook). TemplateRegistry comes from the global WhatsappModule.
 */
@Module({
  imports: [InboxModule, TeachersModule],
  controllers: [ClassroomController, ClassroomPublicController, AssistantsController, ModerationController, LivekitWebhookController],
  providers: [
    { provide: CLASSROOM_CONFIG, useFactory: (): ClassroomConfig => livekitEnv(loadEnv()) },
    { provide: CLASSROOM_WEB_ORIGIN, useFactory: (): string => (loadEnv().WEB_ORIGIN.split(',')[0] ?? '').trim().replace(/\/+$/, '') },
    { provide: RECORDING_CONFIG, useFactory: (): RecordingConfig => recordingEnv(loadEnv()) },
    { provide: LIVEKIT_HTTP, useValue: ((url, init) => fetch(url, init)) satisfies HttpPost },
    { provide: PublicJoinLimit, useFactory: () => new PublicJoinLimit() },
    ClassroomQueries,
    AssistantsQueries,
    AssistantLessonsQueries,
    RoomJoinService,
    GuestJoinService,
    JoinLinkService,
    JoinLinkCopyService,
    AssistantsService,
    LessonRoleService,
    ModerationQueries,
    RecordingQueries,
    LivekitApi,
    RecordingStarter,
    RoomAdmission,
    KickService,
    RecordingListService,
    LivekitWebhookService,
  ],
})
export class ClassroomModule {}
