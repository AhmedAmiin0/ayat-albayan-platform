import type { ThreadPeople } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { detail, failed, inbound, message, NOW, thread } from './thread-fixtures';
import { ThreadModeProvider } from './thread-mode';
import { ThreadScreen } from './ThreadScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => false, replace: (h: string) => mockReplace(h), push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

// The 24 h window is read off the clock, so «he wrote a moment ago» must be relative to now.
const justNow = new Date(Date.now() - 5 * 60_000).toISOString();
const guardianThread = { ...thread, guardian_id: 'g-1', lead_id: null, lead_status: null, session_open: true, last_inbound_at: justNow };
// Teacher mode: the guardian's students she teaches, with no money (subscription null).
const people: ThreadPeople = {
  guardian: { id: 'g-1', name: 'أم يوسف' },
  lead: null,
  students: [{ id: 's-1', code: 'AB-0182', name: 'يوسف أحمد', teacher_name: 'أبرار', status: 'active', subscription: null }],
};
const byAbrar = { ...message({ id: 'm9', body: 'الحلقة الساعة 5', status: 'delivered' }), sent_by_teacher_name: 'أبرار' };

function render() {
  return renderWithQuery(
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't-abrar' }}>
      <ThreadScreen />
    </ThreadModeProvider>,
  );
}

// Only Date is faked: the fixtures' last inbound message is NOW - 1 h, so the 24 h session window
// stays open whatever day the suite runs (it failed in CI once the real clock passed it).
beforeEach(() => {
  fakeNow(NOW);
  mockApiFetch.mockReset();
  mockReplace.mockReset();
});

test('a guardian’s chat: messages, «بعتها», the composer; no subscription panel, no admin actions', async () => {
  const body = detail([inbound, byAbrar, failed], { thread: guardianThread, people });
  mockApiFetch.mockImplementation(async (p: string) => (p.startsWith('/threads') ? body : { open: true }));
  await render();
  expect(await screen.findByText('الحلقة الساعة 5')).toBeTruthy();
  expect(screen.getByText(t.inbox.sentBy.replace('{name}', 'أبرار'))).toBeTruthy();
  expect(screen.getByLabelText(t.inbox.composer.placeholder)).toBeTruthy();
  expect(screen.queryByText(t.inbox.subscription.badge.none)).toBeNull();
  // A failed row: its status word, but retry / «بعتها يدوي» stay the admin's.
  expect(screen.getByText(t.enums.messageStatus.failed)).toBeTruthy();
  expect(screen.getByText(t.messages.errorLine.replace('{reason}', t.messages.errors['131049']))).toBeTruthy();
  expect(screen.queryByText(t.messages.retry)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(mockReplace).toHaveBeenCalledWith('/teacher/chats');
});

test('her own chat with the academy is read-only: the note, no composer', async () => {
  const own = { ...thread, teacher_id: 't-abrar', lead_id: null, lead_status: null };
  mockApiFetch.mockImplementation(async (p: string) => (p.startsWith('/threads') ? detail([inbound], { thread: own }) : { open: true }));
  await render();
  expect(await screen.findByText(t.inbox.ownThreadReadOnly)).toBeTruthy();
  expect(screen.queryByLabelText(t.inbox.composer.placeholder)).toBeNull();
  expect(screen.queryByText(t.inbox.composer.sendTemplate)).toBeNull();
});

afterEach(() => jest.useRealTimers());
