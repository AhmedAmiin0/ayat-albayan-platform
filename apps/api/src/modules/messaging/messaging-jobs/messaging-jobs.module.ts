import { Module } from '@nestjs/common';
import { FollowUpsModule } from '@/modules/messaging/follow-ups';
import { PushReceiptsModule } from '@/modules/messaging/push';
import { RemindersModule } from '@/modules/messaging/reminders';
import { FamilyPushModule } from './family-push/family-push.module';

/**
 * B3 (docs/12 §7): lesson reminders (24 h, same day, teacher), lead follow-ups and the Expo
 * receipts check. The jobs only queue; the WhatsApp sender owns the gate, expiry and retries.
 * The family app's pushes (docs/50 §5 item 6): lesson_starting and report_sent.
 */
@Module({ imports: [RemindersModule, FollowUpsModule, PushReceiptsModule, FamilyPushModule] })
export class MessagingJobsModule {}
