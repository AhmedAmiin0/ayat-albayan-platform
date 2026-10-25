import type { TemplateView, ThreadView } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { detail, inbound, meetReminder, NOW, thread } from '../thread-fixtures';
import { ThreadModeProvider } from '../thread/hooks/thread-mode';
import { ThreadScreen } from './ThreadScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => false, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const rating: TemplateView = { ...meetReminder, key: 'lesson_rating', status: 'approved' };
const guardianThread = { ...thread, guardian_id: 'g-1', lead_id: null, lead_status: null };
const closedThread = { ...guardianThread, last_inbound_at: '2026-10-01T08:00:00Z', session_open: false };

function backend(row: ThreadView = guardianThread) {
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p.startsWith('/auth/me')) return { permissions: ['feedback.write'] };
    if (p.startsWith('/messaging/templates')) return [rating];
    return p.startsWith('/threads') ? detail([inbound], { thread: row }) : { open: true };
  });
}

beforeEach(() => {
  fakeNow(NOW);
  mockApiFetch.mockReset();
});

test('the admin’s guardian thread offers «إرسال تقييم الحلقة» once the 24 h window is closed', async () => {
  backend(closedThread);
  await renderWithQuery(<ThreadScreen />);
  expect(await screen.findByRole('button', { name: t.inbox.rating.send })).toBeTruthy();
});

test('while the 24 h window is open the button is not there (as on the web)', async () => {
  backend();
  await renderWithQuery(<ThreadScreen />);
  await screen.findByText(inbound.body ?? '');
  expect(screen.queryByRole('button', { name: t.inbox.rating.send })).toBeNull();
});

test('a lead’s thread (no guardian) does not', async () => {
  backend({ ...thread, last_inbound_at: '2026-10-01T08:00:00Z' });
  await renderWithQuery(<ThreadScreen />);
  await screen.findByText(inbound.body ?? '');
  expect(screen.queryByRole('button', { name: t.inbox.rating.send })).toBeNull();
});

test('a teacher never sees it', async () => {
  backend(closedThread);
  await renderWithQuery(
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't-1' }}>
      <ThreadScreen />
    </ThreadModeProvider>,
  );
  await screen.findByText(inbound.body ?? '');
  expect(screen.queryByRole('button', { name: t.inbox.rating.send })).toBeNull();
});
