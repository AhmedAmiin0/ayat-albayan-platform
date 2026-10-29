import type { ThreadPeople, ThreadView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { money } from '@/payments/format';
import { renderWithQuery } from '@/test/query';
import { child, CHILD_ID, family, leadOnly, sub, usedUp } from '../subscription/people-fixtures';
import { detail, PHONE, thread } from '../shared/thread-fixtures';
import { ThreadScreen } from './ThreadScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: {
    back: jest.fn(),
    canGoBack: () => true,
    replace: jest.fn(),
    push: (h: unknown) => mockPush(h),
  },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const s = t.inbox.subscription;
const guardianThread: ThreadView = {
  ...thread,
  guardian_id: 'g-1',
  lead_id: null,
  lead_status: null,
};

async function open(people: ThreadPeople, row: ThreadView = guardianThread) {
  mockApiFetch.mockResolvedValue(detail([], { thread: row, people }));
  await renderWithQuery(<ThreadScreen />);
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockPush.mockReset();
});

test.each([
  { badge: 'subscribed', kids: [child()], word: s.badge.subscribed, chip: 'chip-ok', button: t.subscriptions.new },
  {
    badge: 'expired',
    kids: [child({ subscription: usedUp })],
    word: s.badge.expired,
    chip: 'chip-act',
    button: s.renew,
  },
  {
    badge: 'none',
    kids: [child({ subscription: null })],
    word: s.badge.none,
    chip: 'chip-neutral',
    button: t.subscriptions.new,
  },
])('a guardian’s chat says whether the family is subscribed: $badge', async (c) => {
  await open(family(c.kids));
  expect(await screen.findByText(c.word)).toBeTruthy();
  expect(screen.getByTestId(c.chip)).toBeTruthy();
  // One child: the short pill shows the kind, its spoken name says who.
  expect(screen.getByRole('button', { name: `${c.button} — يوسف` })).toBeTruthy();
});

test('a family is ONE folded row (the messages get the room); a tap opens a line per package and one «بلا باقة»', async () => {
  const paid = child({
    id: 'c2',
    name: 'سارة',
    subscription: sub({ due_amount: 0, lessons_used: 2 }),
  });
  await open(family([child(), paid, child({ id: 'c3', name: 'علي', subscription: null })]));
  expect(await screen.findByText(s.subscribedOf.replace('{n}', '2').replace('{total}', '3'))).toBeTruthy();
  // Folded: what needs the admin stays in sight, the rows do not.
  expect(screen.getAllByText(t.enums.subscriptionStatus.unpaid)).toHaveLength(1);
  expect(screen.queryByText('سارة')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${s.showStudents} — `), expanded: false }));
  expect(screen.getByText('يوسف')).toBeTruthy();
  expect(screen.getAllByText(t.enums.subscriptionStatus.unpaid)).toHaveLength(1);
  expect(screen.getByText(`${t.enums.packageSize['8']} · بقيت حلقتان`)).toBeTruthy();
  expect(screen.getByText(s.due.replace('{amount}', money(120, 'SAR')))).toBeTruthy();
  expect(screen.getByText(`${t.enums.packageSize['8']} · بقيت 6 حلقات`)).toBeTruthy();
  expect(screen.getByText(s.noPackage.replace('{names}', 'علي'))).toBeTruthy();
  expect(screen.queryByText(t.subscriptions.empty)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${s.hideStudents} — `), expanded: true }));
  expect(screen.queryByText('سارة')).toBeNull();
});

test('guardian: «جدّد الاشتراك — يوسف» names the child whose package ended and opens the renewal', async () => {
  await open(family([child({ id: 'c2', name: 'سارة' }), child({ subscription: usedUp })]));
  await fireEvent.press(await screen.findByRole('button', { name: `${s.renew} — يوسف` }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/inbox/subscribe',
    params: { studentId: CHILD_ID, phone: PHONE, renew: '1' },
  });
});

test('a lost lead: «غير مشترك» but no «اشترك» (as the web); a converted one: no badge, «اشترك» stays', async () => {
  await open({ ...leadOnly, lead: { id: 'a1', status: 'lost' } }, thread);
  expect(await screen.findByText(s.badge.none)).toBeTruthy();
  expect(screen.queryByRole('button', { name: s.subscribe })).toBeNull();
  await open({ ...leadOnly, lead: { id: 'a1', status: 'converted' } }, { ...thread, lead_status: 'converted' });
  expect(await screen.findByRole('button', { name: s.subscribe })).toBeTruthy();
  expect(screen.queryByText(s.badge.none)).toBeNull();
  expect(screen.queryByText(s.badge.subscribed)).toBeNull();
});

test('a lead with no guardian yet: «غير مشترك», and «اشترك» opens the booking wizard', async () => {
  await open(leadOnly, thread);
  expect(await screen.findByText(s.badge.none)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: s.subscribe }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/inbox/book',
    params: { leadId: 'a1', phone: PHONE, mode: 'subscribe', name: 'هدى سالم' },
  });
});

test('a teacher’s chat, or a thread saved before `people` existed: no subscription panel', async () => {
  const teacher = { ...thread, lead_id: null, lead_status: null, teacher_id: 't-1' };
  await open({ guardian: null, lead: null, students: [] }, teacher);
  expect(await screen.findByText(t.inbox.empty)).toBeTruthy();
  expect(screen.queryByText(s.badge.none)).toBeNull();

  mockApiFetch.mockResolvedValue({ thread, messages: [], has_more: false, lessons: [] });
  await renderWithQuery(<ThreadScreen />);
  expect((await screen.findAllByText(t.inbox.empty)).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: s.subscribe })).toBeNull();
});
