import { subscriptionStatusStyle } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { money, partPaidLine } from '@/payments/format';
import { child, CHILD_ID, family, leadOnly, sub, usedUp } from './people-fixtures';
import { badgeChip, childChip, dueLine, packageText, subscribeAction } from './subscription-words';

const s = t.inbox.subscription;
const PHONE = '+966552147730';

test('the badge chip: shape from the shared map, the word from ar.json', () => {
  expect(badgeChip('subscribed')).toEqual({
    ...subscriptionStatusStyle.active,
    label: s.badge.subscribed,
  });
  expect(badgeChip('expired')).toEqual({ ...subscriptionStatusStyle.expired, label: s.badge.expired });
  expect(badgeChip('none')).toEqual({ tone: 'neutral', glyph: 'hollow', label: s.badge.none });
});

test('a child: the package and what is left, the due on its own, a chip only when it needs the admin', () => {
  expect(packageText(sub())).toBe(`${t.enums.packageSize['8']} · بقيت حلقتان`);
  expect(packageText(sub({ package_size: null }))).toBe(`${t.pricing.packages.custom.name} · بقيت حلقتان`);
  expect(packageText(usedUp)).toBe(t.enums.packageSize['8']); // expired: no «فاضل» under «انتهت الباقة»
  expect(packageText(null)).toBe(t.subscriptions.empty);
  expect(dueLine(sub())).toBe(s.due.replace('{amount}', money(120, 'SAR')));
  expect(dueLine(sub({ due_amount: 0 }))).toBeNull();
  // Part of it came (owner 2026-10-28): what was paid of what, not just «عليه».
  expect(dueLine(sub({ price: 81, paid_amount: 80, due_amount: 1 }))).toBe(partPaidLine({ paid: 80, price: 81, currency: 'SAR' }));
  expect(childChip(sub())).toEqual({ ...subscriptionStatusStyle.unpaid, label: t.enums.subscriptionStatus.unpaid });
  expect(childChip(sub({ status: 'paused', due_amount: 0 }))?.label).toBe(t.enums.subscriptionStatus.paused);
  // Paid in full and used up: the DB says unpaid until renewed, the chat must not say «غير مدفوع».
  expect(childChip(sub({ status: 'unpaid', due_amount: 0, lessons_remaining: 0 }))).toBeNull();
  expect(childChip(null)).toBeNull();
});

test('a guardian: the child whose package ended gets «جدّد الاشتراك — name»; running → «اشتراك جديد» (as the web)', () => {
  const running = child({ id: 'other', name: 'سارة' });
  const action = subscribeAction({
    people: family([running, child({ subscription: usedUp })]),
    phone: PHONE,
  });
  expect(action).toEqual({
    label: `${s.renew} — يوسف`,
    href: { pathname: '/inbox/subscribe', params: { studentId: CHILD_ID, phone: PHONE, renew: '1' } },
  });
  // Everyone running: a new package for the first child; one child → no name in the label.
  expect(subscribeAction({ people: family([running]), phone: PHONE })).toEqual({
    label: t.subscriptions.new,
    href: { pathname: '/inbox/subscribe', params: { studentId: 'other', phone: PHONE } },
  });
});

test('a guardian with a child that never had a package: «اشتراك جديد»; a trial does not count', () => {
  const trial = child({ subscription: sub({ status: 'trial', package_size: 'trial' }) });
  for (const c of [child({ subscription: null }), trial]) {
    expect(subscribeAction({ people: family([c]), phone: PHONE })?.label).toBe(t.subscriptions.new);
  }
  expect(subscribeAction({ people: family([]), phone: PHONE })).toBeNull();
});

test('a lead without a guardian: «اشترك» opens the booking wizard with its package step', () => {
  const thread = { lead_name: 'هدى سالم', display_name: 'Huda' };
  expect(subscribeAction({ people: leadOnly, phone: PHONE, thread })).toEqual({
    label: s.subscribe,
    href: {
      pathname: '/inbox/book',
      params: { leadId: 'a1', phone: PHONE, mode: 'subscribe', name: 'هدى سالم' },
    },
  });
  const nameless = subscribeAction({ people: leadOnly, phone: PHONE, thread: null });
  expect(nameless?.href).toEqual({
    pathname: '/inbox/book',
    params: { leadId: 'a1', phone: PHONE, mode: 'subscribe' },
  });
});

test('nobody on file (a teacher, an unknown number): no button', () => {
  const nobody = { guardian: null, lead: null, students: [] };
  expect(subscribeAction({ people: nobody, phone: PHONE })).toBeNull();
});

test('a lost lead gets no «اشترك»', () => {
  expect(subscribeAction({ people: { ...leadOnly, lead: { id: 'a1', status: 'lost' } }, phone: PHONE })).toBeNull();
});
