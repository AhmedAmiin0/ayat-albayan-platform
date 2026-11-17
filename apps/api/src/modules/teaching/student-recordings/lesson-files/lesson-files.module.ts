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

/**
 * «ملفات الحلقة» and the family's «التسجيلات» (owner 2026-11-17): lesson_files (migration
 * 20261117100200) in the report-attachments bucket; Storage and Audit are global modules.
 */
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
