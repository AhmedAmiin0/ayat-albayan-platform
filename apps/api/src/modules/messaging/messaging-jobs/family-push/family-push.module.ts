import { Module } from '@nestjs/common';
import { ClassroomSettings } from '@/modules/teaching/classroom';
import { FamilyPushJob } from './family-push.job';
import { FamilyPushRepo } from './family-push.repo';
import { FamilyPushService } from './family-push.service';

/**
 * The family app's pushes (docs/50 §5 item 6): lesson_starting and report_sent, one sweep a
 * minute. PushService and SettingsService (under ClassroomSettings) come from global modules.
 */
@Module({ providers: [ClassroomSettings, FamilyPushJob, FamilyPushRepo, FamilyPushService] })
export class FamilyPushModule {}
