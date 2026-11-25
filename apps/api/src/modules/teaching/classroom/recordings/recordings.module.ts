import { Module } from '@nestjs/common';
import { ClassroomSharedModule } from '@/modules/teaching/classroom/classroom-shared.module';
import {
  MeetingRecordingListService,
  RecordingListService,
  RecordingViews,
} from './recording-list.service';
import { RecordingLifecycle } from './recording.lifecycle';
import { MeetingRecordingsController, RecordingStatusController } from './recordings.controller';

/** The moderation routes list a lesson's recordings; the LiveKit webhook drives the lifecycle. */
@Module({
  imports: [ClassroomSharedModule],
  controllers: [MeetingRecordingsController, RecordingStatusController],
  providers: [
    ...[RecordingViews, RecordingListService, MeetingRecordingListService, RecordingLifecycle],
  ],
  exports: [RecordingViews, RecordingListService, RecordingLifecycle],
})
export class RecordingsModule {}
