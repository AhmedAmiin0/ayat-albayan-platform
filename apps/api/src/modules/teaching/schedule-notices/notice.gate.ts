import { Injectable } from '@nestjs/common';
import { NotificationPolicy } from '@/modules/messaging/notification-rules';
import type { NoticeKey } from './notice.types';
import { ScheduleNoticesRepo } from './schedule-notices.repo';

/**
 * Whether a notice's WhatsApp can go on the notifications line: its catalogue row on for WhatsApp
 * and its template approved (the CRM / Meta, as every producer). Never a free-text fallback.
 * ScheduleNotices and FamilyMoveNotice ask the same question here.
 */
@Injectable()
export class NoticeGate {
  constructor(
    private readonly policy: NotificationPolicy,
    private readonly repo: ScheduleNoticesRepo,
  ) {}

  async usable(key: NoticeKey): Promise<boolean> {
    if (!(await this.policy.channelOn(key, 'whatsapp'))) return false;
    return this.repo.approved(key);
  }
}
