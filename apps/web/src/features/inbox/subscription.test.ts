import { threadBadge } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { pupil } from './inbox-fixture';
import { badgeStyle, dueText, leadChip, packageChipProps, packageLine, subscribeLabel } from './subscription';

const GUARDIAN = { id: 'g-1', name: 'أم سهيلة' };
const LEAD = { id: 'lead-1', status: 'new' as const };

describe('threadBadge (R-SUB-01)', () => {
  it('a guardian: the family badge over their children', () => {
    expect(threadBadge({ guardian: GUARDIAN, lead: null, students: [pupil()] })).toBe('subscribed');
    const ended = pupil({}, { status: 'expired', lessons_remaining: 0 });
    expect(threadBadge({ guardian: GUARDIAN, lead: LEAD, students: [ended] })).toBe('expired');
    expect(threadBadge({ guardian: GUARDIAN, lead: null, students: [pupil({}, null)] })).toBe('none');
    expect(threadBadge({ guardian: GUARDIAN, lead: null, students: [] })).toBe('none');
  });

  it('a lead is «مش مشترك»; a teacher or an unknown number gets no chip', () => {
    expect(threadBadge({ guardian: null, lead: LEAD, students: [] })).toBe('none');
    expect(threadBadge({ guardian: null, lead: null, students: [] })).toBeNull();
  });

  it('a converted lead with no guardian here: no badge, and its chip is the neutral «اتحول لطالب», never «مشترك»', () => {
    expect(threadBadge({ guardian: null, lead: { ...LEAD, status: 'converted' }, students: [] })).toBeNull();
    expect(leadChip('converted')).toEqual({ tone: 'neutral', glyph: 'fill', label: t.inbox.convertedLead });
    expect(leadChip('new').label).toBe(t.enums.leadStatus.new);
  });

  it('nuqta grammar: running = ok fill, ended = the admin’s turn, none = neutral', () => {
    expect(badgeStyle).toEqual({
      subscribed: { tone: 'ok', glyph: 'fill' },
      expired: { tone: 'act', glyph: 'struck' },
      none: { tone: 'neutral', glyph: 'hollow' },
    });
  });
});

describe('the package line', () => {
  it('names the package, then the lessons left across every package', () => {
    const sub = pupil().subscription;
    if (!sub) throw new Error('fixture');
    expect(packageLine(sub)).toBe(`${t.enums.packageSize['8']} — ${t.subscriptions.progress.left.few.replace('{n}', '3')}`);
    expect(packageLine({ ...sub, package_size: null, lessons_used: 10 })).toBe(t.subscriptions.progress.over.two);
  });

  it('an expired package shows its name only: no «فاضل 4 حلقات» under «الباقة خلصت»', () => {
    const sub = pupil({}, { status: 'expired', lessons_used: 4, lessons_remaining: 4 }).subscription;
    if (!sub) throw new Error('fixture');
    expect(packageLine(sub)).toBe(t.enums.packageSize['8']);
  });

  it('the child’s chip comes from the numbers: a paid, used-up package is ended, not «مش مدفوع»', () => {
    const used = pupil({}, { status: 'unpaid', lessons_remaining: 0, due_amount: 0 }).subscription;
    const owes = pupil({}, { status: 'unpaid', lessons_remaining: 5, due_amount: 120 }).subscription;
    if (!used || !owes) throw new Error('fixture');
    expect(packageChipProps(used).label).toBe(t.enums.subscriptionStatus.expired);
    expect(packageChipProps(owes)).toMatchObject({ tone: 'act', label: t.enums.subscriptionStatus.unpaid });
  });

  it('the money still owed on the newest package, nothing once paid', () => {
    expect(dueText({ due_amount: 290, currency: 'SAR' })).toBe(t.inbox.subscription.due.replace('{amount}', '290 ر.س'));
    expect(dueText({ due_amount: 0, currency: 'SAR' })).toBeNull();
  });
});

describe('subscribeLabel', () => {
  it('«جدّد الاشتراك» once the package ended or is used up, else «اشتراك جديد»', () => {
    expect(subscribeLabel(pupil({}, { status: 'expired' }).subscription)).toBe(t.inbox.subscription.renew);
    expect(subscribeLabel(pupil({}, { status: 'active', lessons_remaining: 0 }).subscription)).toBe(t.inbox.subscription.renew);
    expect(subscribeLabel(pupil().subscription)).toBe(t.subscriptions.new);
    expect(subscribeLabel(pupil({}, { status: 'trial' }).subscription)).toBe(t.subscriptions.new);
    expect(subscribeLabel(null)).toBe(t.subscriptions.new);
  });
});
