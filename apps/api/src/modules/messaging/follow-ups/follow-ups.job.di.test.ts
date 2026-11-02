import { describe, expect, it } from 'vitest';
import { NotificationPolicy } from '@/modules/messaging/notification-rules/policy/policy';
import { FollowUpSlots } from './follow-up-slots';
import { FollowUpsJob } from './follow-ups.job';
import { FollowUpsRepo } from './follow-ups.repo';
import { FollowUpsSettings } from './follow-ups.settings';

// docs/32 s2 (D1: constructors take 4): the FollowUpsReads bag is gone; Nest injects each one.
describe('FollowUpsJob DI', () => {
  it('takes the repo, the slots, the settings and NotificationPolicy in its constructor', () => {
    const types: unknown = Reflect.getMetadata('design:paramtypes', FollowUpsJob);
    expect(types).toEqual([FollowUpsRepo, FollowUpSlots, FollowUpsSettings, NotificationPolicy]);
  });
});
