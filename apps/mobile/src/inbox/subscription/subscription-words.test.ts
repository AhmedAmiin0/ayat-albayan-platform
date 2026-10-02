import { subscriptionStatusStyle } from '@ab/shared';
import { t } from '@/lib/i18n';
import { money } from '@/payments/format';
import { child, CHILD_ID, family, leadOnly, sub, usedUp } from './people-fixtures';
import { badgeChip, studentLine, subscribeAction } from './subscription-words';

const s = t.inbox.subscription;
const PHONE = '+966552147730';

test('the badge chip: shape from the shared map, the word from ar.json', () => {
  expect(badgeChip('subscribed')).toEqual({
    ...subscriptionStatusStyle.active,
    label: s.subscribed,
  });
  expect(badgeChip('expired')).toEqual({ ...subscriptionStatusStyle.expired, label: s.expired });
  expect(badgeChip('none')).toEqual({ tone: 'neutral', glyph: 'hollow', label: s.none });
});

test('a child line: package, what is left, what is still due', () => {
  expect(studentLine(child())).toBe(
    `يوسف · ${t.enums.packageSize['8']} · فاضل حلقتين · ${s.due.replace('{amount}', money(120, 'SAR'))}`,
  );
  // Paid in full: no due part. A custom count has no size.
  const paid = child({ subscription: sub({ package_size: null, due_amount: 0 }) });
  expect(studentLine(paid)).toBe(`يوسف · ${t.pricing.packages.custom.name} · فاضل حلقتين`);
  expect(studentLine(child({ subscription: usedUp }))).toContain(t.subscriptions.progress.zero);
  expect(studentLine(child({ subscription: null }))).toBe(`يوسف · ${s.none}`);
});

test('a guardian: «جدّد» for the first child whose package is not running', () => {
  const running = child({ id: 'other', name: 'سارة' });
  const action = subscribeAction({
    people: family([running, child({ subscription: usedUp })]),
    phone: PHONE,
  });
  expect(action).toEqual({
    label: s.renew,
    href: { pathname: '/inbox/subscribe', params: { studentId: CHILD_ID, phone: PHONE } },
  });
  // Everyone running: still «جدّد» (an early renewal) for the first child.
  expect(subscribeAction({ people: family([running]), phone: PHONE })?.href).toMatchObject({
    params: { studentId: 'other' },
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
