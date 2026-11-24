import { Module } from '@nestjs/common';
import { PortalModule } from '@/modules/people/portal';
import { TeachersModule } from '@/modules/people/teachers';
import { LessonAssetsRepo } from './lesson-assets.repo';
import { LessonAssetsService } from './lesson-assets.service';
import { LessonFilesAccess } from './lesson-files.access';
import { LessonFilesController } from './lesson-files.controller';
import { LessonFilesRepo } from './lesson-files.repo';
import { LessonFilesService } from './lesson-files.service';
import { PortalAssetsController } from './portal/portal-assets.controller';
import { PortalAssetsService } from './portal/portal-assets.service';

/** lesson_files (migration 20261117150200) in the report-attachments bucket. */
@Module({
  imports: [TeachersModule, PortalModule],
  controllers: [LessonFilesController, PortalAssetsController],
  providers: [
    LessonFilesRepo,
    LessonAssetsRepo,
    LessonFilesAccess,
    LessonFilesService,
    LessonAssetsService,
    PortalAssetsService,
  ],
})
export class LessonFilesModule {}
