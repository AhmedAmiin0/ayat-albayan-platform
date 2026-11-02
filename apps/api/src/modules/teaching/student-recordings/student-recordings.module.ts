import { Module } from '@nestjs/common';
import { ClassroomModule } from '@/modules/teaching/classroom/classroom.module';
import { TeachersModule } from '@/modules/people/teachers/teachers.module';
import { RecordingAdminRepo } from './recording-admin.repo';
import { RecordingDeleteService } from './retention/recording-delete.service';
import { RecordingEraser } from './retention/recording-eraser';
import { RecordingMaintenanceJob } from './retention/recording-maintenance.job';
import { RecordingRetention } from './retention/recording-retention';
import { RecordingVisibilityService } from './recording-visibility.service';
import { RecordingRetentionRepo } from './retention/recording-retention.repo';
import { RecordingSettings } from './recordings.settings';
import { StudentRecordingAccess } from './student-recordings.access';
import { StudentRecordingsController } from './student-recordings.controller';
import { StudentRecordingRepo } from './student-recordings.repo';
import { StudentRecordingsService } from './student-recordings.service';

/**
 * Recordings in the teacher-student file (owner, 2026-10-05): GET /students/:id/recordings, the
 * visible-to-student toggle, the admin delete, and the hourly stuck sweeper + retention job.
 * Settings, Storage and Audit are global modules; RecordingViews comes from ClassroomModule.
 */
@Module({
  imports: [ClassroomModule, TeachersModule],
  controllers: [StudentRecordingsController],
  providers: [
    StudentRecordingRepo,
    StudentRecordingAccess,
    StudentRecordingsService,
    RecordingAdminRepo,
    RecordingEraser,
    RecordingVisibilityService,
    RecordingDeleteService,
    RecordingRetentionRepo,
    RecordingRetention,
    RecordingSettings,
    RecordingMaintenanceJob,
  ],
})
export class StudentRecordingsModule {}
