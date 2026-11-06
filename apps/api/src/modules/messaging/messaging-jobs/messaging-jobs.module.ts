import { Module } from '@nestjs/common';
import { FollowUpsModule } from '@/modules/messaging/follow-ups/follow-ups.module';
import { PushReceiptsModule } from '@/modules/messaging/push/push-receipts.module';
import { RemindersModule } from '@/modules/messaging/reminders/reminders.module';

/**
 * B3 (docs/12 §7): lesson reminders (24 h, same day, teacher), lead follow-ups and the Expo
 * receipts check. The jobs only queue; the WhatsApp sender owns the gate, expiry and retries.
 */
@Module({ imports: [RemindersModule, FollowUpsModule, PushReceiptsModule] })
export class MessagingJobsModule {}
