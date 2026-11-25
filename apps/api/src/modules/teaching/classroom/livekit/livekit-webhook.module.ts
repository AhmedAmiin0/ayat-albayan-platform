import { Module } from '@nestjs/common';
import { ClassroomSharedModule } from '@/modules/teaching/classroom/classroom-shared.module';
import { LiveRoomModule } from '@/modules/teaching/classroom/live';
import { RecordingsModule } from '@/modules/teaching/classroom/recordings';
import { LivekitWebhookController } from './livekit-webhook.controller';
import { LivekitWebhookService } from './livekit-webhook.service';

@Module({
  imports: [ClassroomSharedModule, RecordingsModule, LiveRoomModule],
  controllers: [LivekitWebhookController],
  providers: [LivekitWebhookService],
})
export class LivekitWebhookModule {}
