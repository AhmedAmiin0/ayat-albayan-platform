import { describe, expect, it } from 'vitest';
import type { SubscriptionStatus } from '@ab/catalog';
import { familyRing, type BadgeStudent, type FamilyRing } from './thread-people.js';

const kid = (status: SubscriptionStatus, lessons_remaining: number): BadgeStudent => ({
  subscription: { status, lessons_remaining },
});
const none: BadgeStudent = { subscription: null };

describe('familyRing: the chat list avatar ring (threshold 2)', () => {
  it.each<[string, BadgeStudent[], FamilyRing | null]>([
    ['no students', [], null],
    ['students without packages', [none], null],
    ['a trial package only', [kid('trial', 1)], null],
    ['a cancelled package only', [kid('cancelled', 4)], null],
    ['active above the threshold', [kid('active', 3)], 'subscribed'],
    ['active at the threshold', [kid('active', 2)], 'renewal'],
    ['active below the threshold', [kid('active', 1)], 'renewal'],
    ['unpaid at the threshold', [kid('unpaid', 2)], 'renewal'],
    ['used up (unpaid at 0)', [kid('unpaid', 0)], 'renewal'],
    ['expired', [kid('expired', 0)], 'renewal'],
    ['paused low raises no alert', [kid('paused', 1)], 'subscribed'],
    ['one child low, one with lessons', [kid('active', 9), kid('active', 1)], 'renewal'],
    ['one child ended, one running', [kid('expired', 0), kid('active', 9)], 'subscribed'],
    ['a trial beside an ended package', [kid('trial', 1), kid('expired', 0)], 'renewal'],
  ])('%s', (_, kids, ring) => {
    expect(familyRing(kids, 2)).toBe(ring);
  });

  it('follows the threshold setting', () => {
    expect(familyRing([kid('active', 3)], 3)).toBe('renewal');
    expect(familyRing([kid('active', 3)], 0)).toBe('subscribed');
  });
});
