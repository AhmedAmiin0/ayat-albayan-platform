import { Module } from '@nestjs/common';
import { ClassroomSharedModule } from '@/modules/teaching/classroom/classroom-shared.module';
import { StudentLinkAdminService } from './student-link.admin.service';
import { StudentLinkAdminController, StudentLinkPublicController } from './student-link.controller';
import { StudentLinkRepo } from './student-link.repo';
import { StudentLinkService } from './student-link.service';

/** The family portal admits its own student like the student's link does. */
@Module({
  imports: [ClassroomSharedModule],
  controllers: [StudentLinkPublicController, StudentLinkAdminController],
  providers: [StudentLinkRepo, StudentLinkService, StudentLinkAdminService],
  exports: [StudentLinkRepo, StudentLinkService],
})
export class StudentLinkModule {}
