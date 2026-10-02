import type { ThreadPeople, ThreadView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { child, CHILD_ID, family, leadOnly, sub, usedUp } from './subscription/people-fixtures';
import { detail, PHONE, thread } from './thread-fixtures';
import { ThreadScreen } from './ThreadScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
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
  { badge: 'subscribed', kids: [child()], word: s.subscribed, chip: 'chip-ok', button: s.renew },
  {
    badge: 'expired',
    kids: [child({ subscription: usedUp })],
    word: s.expired,
    chip: 'chip-act',
    button: s.renew,
  },
  {
    badge: 'none',
    kids: [child({ subscription: null })],
    word: s.none,
    chip: 'chip-neutral',
    button: t.subscriptions.new,
  },
])('a guardian’s chat says whether the family is subscribed: $badge', async (c) => {
  await open(family(c.kids));
  expect(await screen.findByText(c.word)).toBeTruthy();
  expect(screen.getByTestId(c.chip)).toBeTruthy();
  expect(screen.getByRole('button', { name: c.button })).toBeTruthy();
});

test('each child’s package line, with what is still due', async () => {
  const paid = child({
    id: 'c2',
    name: 'سارة',
    subscription: sub({ due_amount: 0, lessons_used: 2 }),
  });
  await open(family([child(), paid]));
  expect(await screen.findByText(/^يوسف · .* · فاضل حلقتين · فاضل عليه/)).toBeTruthy();
  expect(screen.getByText(`سارة · ${t.enums.packageSize['8']} · فاضل 6 حلقات`)).toBeTruthy();
});

test('guardian: «جدّد» opens the subscribe screen for the child whose package ended', async () => {
  await open(family([child({ id: 'c2', name: 'سارة' }), child({ subscription: usedUp })]));
  await fireEvent.press(await screen.findByRole('button', { name: s.renew }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/inbox/subscribe',
    params: { studentId: CHILD_ID, phone: PHONE },
  });
});

test('a lead with no guardian yet: «مش مشترك», and «اشترك» opens the booking wizard', async () => {
  await open(leadOnly, thread);
  expect(await screen.findByText(s.none)).toBeTruthy();
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
  expect(screen.queryByText(s.none)).toBeNull();

  mockApiFetch.mockResolvedValue({ thread, messages: [], has_more: false, lessons: [] });
  await renderWithQuery(<ThreadScreen />);
  expect((await screen.findAllByText(t.inbox.empty)).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: s.subscribe })).toBeNull();
});
