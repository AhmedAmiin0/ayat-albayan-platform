import { Module } from '@nestjs/common';
import { ClassroomModule } from '../classroom/classroom.module';
import { TeachersModule } from '../teachers/teachers.module';
import { RecordingAdminQueries } from './recording-admin.queries';
import { RecordingDeleteService } from './recording-delete.service';
import { RecordingEraser } from './recording-eraser';
import { RecordingMaintenanceJob } from './recording-maintenance.job';
import { RecordingRetention } from './recording-retention';
import { RecordingVisibilityService } from './recording-visibility.service';
import { RecordingRetentionQueries } from './recording-retention.queries';
import { RecordingSettings } from './recordings.settings';
import { StudentRecordingAccess } from './student-recordings.access';
import { StudentRecordingsController } from './student-recordings.controller';
import { StudentRecordingQueries } from './student-recordings.queries';
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
    StudentRecordingQueries,
    StudentRecordingAccess,
    StudentRecordingsService,
    RecordingAdminQueries,
    RecordingEraser,
    RecordingVisibilityService,
    RecordingDeleteService,
    RecordingRetentionQueries,
    RecordingRetention,
    RecordingSettings,
    RecordingMaintenanceJob,
  ],
})
export class StudentRecordingsModule {}
