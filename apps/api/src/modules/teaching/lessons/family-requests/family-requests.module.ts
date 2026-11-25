import { Module } from '@nestjs/common';
import { LessonProposalsModule } from '@/modules/teaching/lessons/proposals';
import { LessonStoreModule } from '@/modules/teaching/lessons/store';
import { TeacherMeModule } from '@/modules/teaching/lessons/teacher-me';
import { FamilyRequestAccess } from './family-request.access';
import { FamilyRequestService } from './family-request.service';
import { FamilyRequestsController } from './family-requests.controller';

@Module({
  imports: [LessonStoreModule, LessonProposalsModule, TeacherMeModule],
  controllers: [FamilyRequestsController],
  providers: [FamilyRequestAccess, FamilyRequestService],
  exports: [FamilyRequestService],
})
export class FamilyRequestsModule {}
