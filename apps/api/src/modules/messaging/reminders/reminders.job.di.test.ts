import { describe, expect, it } from 'vitest';
import { PushService } from '@/common/push/push.service';
import { NotificationPolicy } from '@/modules/messaging/notification-rules/policy/policy';
import { RemindersJob } from './reminders.job';
import { RemindersRepo } from './reminders.repo';
import { RemindersSettings } from './reminders.settings';

// docs/32 s2 (D1: constructors take 4): the RemindersDeps bag is gone; Nest injects each one.
describe('RemindersJob DI', () => {
  it('takes the repo, the settings, PushService and NotificationPolicy in its constructor', () => {
    const types: unknown = Reflect.getMetadata('design:paramtypes', RemindersJob);
    expect(types).toEqual([RemindersRepo, RemindersSettings, PushService, NotificationPolicy]);
  });
});
