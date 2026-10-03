import { describe, expect, it } from 'vitest';
import type { LeadStatus, SubscriptionStatus } from '../enums/index.js';
import { familyUnpaid, packageChip, subscribeKind, threadBadge, type BadgeStudent } from './thread-people.js';

const kid = (status: SubscriptionStatus, lessons_remaining: number): BadgeStudent => ({
  subscription: { status, lessons_remaining },
});
const lead = (status: LeadStatus) => ({ guardian: null, lead: { id: 'l1', status }, students: [] });

describe('threadBadge (R-SUB-01): the chat chip', () => {
  it('a guardian → the family badge', () => {
    expect(threadBadge({ guardian: { id: 'g', name: 'أم يوسف' }, lead: null, students: [] })).toBe('none');
  });
  it.each<LeadStatus>(['new', 'trial_booked', 'lost'])('a %s lead → «غير مشترك»', (status) => {
    expect(threadBadge(lead(status))).toBe('none');
  });
  it('a converted lead with no guardian on this number → no badge (never «مشترك» + «غير مشترك»)', () => {
    expect(threadBadge(lead('converted'))).toBeNull();
  });
  it('a teacher or an unknown number → no badge', () => {
    expect(threadBadge({ guardian: null, lead: null, students: [] })).toBeNull();
  });
});

describe('familyUnpaid: the list row «غير مدفوع»', () => {
  it.each<[string, BadgeStudent[], boolean]>([
    ['unpaid and running', [kid('unpaid', 3)], true],
    ['unpaid but used up (a renewal, not a debt)', [kid('unpaid', 0)], false],
    ['active', [kid('active', 3)], false],
    ['a sibling owes', [kid('active', 2), kid('unpaid', 8)], true],
    ['no package', [{ subscription: null }], false],
  ])('%s → %s', (_, students, unpaid) => {
    expect(familyUnpaid(students)).toBe(unpaid);
  });
});

describe('packageChip: a child’s chip from the numbers', () => {
  const sub = (status: SubscriptionStatus, lessons_remaining: number, due_amount: number) => ({ status, lessons_remaining, due_amount });
  it.each<[string, ReturnType<typeof sub>, SubscriptionStatus]>([
    ['owes money, lessons left', sub('unpaid', 4, 145), 'unpaid'],
    ['paid in full and used up (DB still says unpaid)', sub('unpaid', 0, 0), 'expired'],
    ['owes money and used up → renew first', sub('unpaid', 0, 50), 'expired'],
    ['expired by date with lessons left', sub('expired', 4, 0), 'expired'],
    ['paused', sub('paused', 4, 0), 'paused'],
    ['trial', sub('trial', 1, 0), 'trial'],
    ['paid and running', sub('active', 6, 0), 'active'],
  ])('%s → %s', (_, s, chip) => {
    expect(packageChip(s)).toBe(chip);
  });
});

describe('subscribeKind: one rule for web and mobile', () => {
  it('no package → new', () => expect(subscribeKind(null)).toBe('new'));
  it('running → new (a second package, not a renewal)', () => expect(subscribeKind({ status: 'active', lessons_remaining: 3 })).toBe('new'));
  it('ended → renew', () => expect(subscribeKind({ status: 'unpaid', lessons_remaining: 0 })).toBe('renew'));
});
