import { Module } from '@nestjs/common';
import { livekitEnv, loadEnv } from '../../env';
import { InboxModule } from '../inbox/inbox.module';
import { TeachersModule } from '../teachers/teachers.module';
import { AssistantsController } from './assistants.controller';
import { AssistantLessonsQueries } from './assistants.lessons';
import { AssistantsQueries } from './assistants.queries';
import { AssistantsService } from './assistants.service';
import { CLASSROOM_CONFIG, CLASSROOM_WEB_ORIGIN, type ClassroomConfig } from './classroom.config';
import { ClassroomController } from './classroom.controller';
import { ClassroomPublicController } from './classroom.public.controller';
import { ClassroomQueries } from './classroom.queries';
import { GuestJoinService } from './guest-join.service';
import { PublicJoinLimit } from './join-limit';
import { JoinLinkCopyService } from './join-link.copy.service';
import { JoinLinkService } from './join-link.service';
import { RoomJoinService } from './room-join.service';

/**
 * Online classrooms on the self-hosted LiveKit (docs/09, tools/livekit): staff join with their
 * login (POST /lessons/:id/room/join), the family with a one-lesson link (POST /public/join/:token,
 * sent by «ابعت لينك الحلقة» through the inbox Outbox), and the admin assigns teaching assistants
 * per student. TemplateRegistry comes from the global WhatsappModule.
 */
@Module({
  imports: [InboxModule, TeachersModule],
  controllers: [ClassroomController, ClassroomPublicController, AssistantsController],
  providers: [
    { provide: CLASSROOM_CONFIG, useFactory: (): ClassroomConfig => livekitEnv(loadEnv()) },
    { provide: CLASSROOM_WEB_ORIGIN, useFactory: (): string => (loadEnv().WEB_ORIGIN.split(',')[0] ?? '').trim().replace(/\/+$/, '') },
    { provide: PublicJoinLimit, useFactory: () => new PublicJoinLimit() },
    ClassroomQueries,
    AssistantsQueries,
    AssistantLessonsQueries,
    RoomJoinService,
    GuestJoinService,
    JoinLinkService,
    JoinLinkCopyService,
    AssistantsService,
  ],
})
export class ClassroomModule {}
