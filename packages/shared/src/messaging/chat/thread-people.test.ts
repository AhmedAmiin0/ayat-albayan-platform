import { describe, expect, it } from 'vitest';
import type { SubscriptionStatus } from '../../enums/index.js';
import { subscriptionBadge, type BadgeStudent, type SubscriptionBadge } from './thread-people.js';

const kid = (status: SubscriptionStatus, lessons_remaining: number): BadgeStudent => ({
  subscription: { status, lessons_remaining },
});
const none: BadgeStudent = { subscription: null };

describe('subscriptionBadge (R-SUB-01): the family’s «مشترك» state in the chat', () => {
  it.each<[string, BadgeStudent[], SubscriptionBadge]>([
    ['no students (a lead)', [], 'none'],
    ['students without packages', [none, none], 'none'],
    ['a trial package only', [kid('trial', 1)], 'none'],
    ['active with lessons left', [kid('active', 5)], 'subscribed'],
    ['unpaid but running (money owed)', [kid('unpaid', 3)], 'subscribed'],
    ['paused with lessons left', [kid('paused', 4)], 'subscribed'],
    ['unpaid and used up (renewal due)', [kid('unpaid', 0)], 'expired'],
    ['attended past the package', [kid('unpaid', -2)], 'expired'],
    ['expired', [kid('expired', 0)], 'expired'],
    ['one child expired, a sibling running', [kid('expired', 0), kid('active', 2)], 'subscribed'],
    ['one child used up, a sibling without a package', [kid('unpaid', 0), none], 'expired'],
    ['a trial child and an expired sibling', [kid('trial', 1), kid('expired', 0)], 'expired'],
  ])('%s → %s', (_, students, badge) => {
    expect(subscriptionBadge(students)).toBe(badge);
  });
});
