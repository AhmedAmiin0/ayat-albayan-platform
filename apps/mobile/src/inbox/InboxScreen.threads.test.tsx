import type { ThreadView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { InboxScreen } from './InboxScreen';
import { thread } from './thread-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: string) => mockPush(mockHref) } }));

// Invented sample threads: a guardian asking to move a lesson, a teacher, and a failed send.
const guardian: ThreadView = {
  ...thread,
  phone_e164: '+966552147731',
  display_name: 'أم إيمان',
  last_direction: 'inbound',
  last_body: 'ممكن نأجل حلقة بكرة؟',
  unread_count: 1,
  lead_id: null,
  lead_status: null,
  lead_source: null,
  guardian_id: 'g-1',
  guardian_name: 'أم إيمان',
};
const teacher: ThreadView = {
  ...thread,
  phone_e164: '+201066000001',
  display_name: 'أ. فاطمة',
  last_direction: 'inbound',
  last_body: 'هتأخر عشر دقايق',
  lead_id: null,
  lead_status: null,
  lead_source: null,
  teacher_id: 't-1',
  teacher_name: 'أ. فاطمة',
};
const failedSend: ThreadView = { ...thread, phone_e164: '+966552147732', display_name: 'أم نور', last_status: 'failed' };

const threadsPage = (items: ThreadView[]) => ({ items, total: items.length, page: 1, pageSize: 25 });

beforeEach(() => {
  mockApiFetch.mockReset();
  mockPush.mockReset();
});

test('the tab opens on every WhatsApp thread: a guardian and a teacher are reachable, not only by push', async () => {
  mockApiFetch.mockResolvedValue(threadsPage([guardian, teacher, failedSend]));
  await renderWithQuery(<InboxScreen />);
  expect(await screen.findByText('أم إيمان')).toBeTruthy();
  expect(screen.getByRole('header', { name: t.nav.conversations })).toBeTruthy();
  expect(screen.getByText('ممكن نأجل حلقة بكرة؟')).toBeTruthy();
  expect(screen.getByText(t.inbox.kind.guardian)).toBeTruthy();
  expect(screen.getByText('هتأخر عشر دقايق')).toBeTruthy();
  expect(screen.getByText(t.inbox.kind.teacher)).toBeTruthy();
  expect(screen.getByText(t.inbox.unread.one)).toBeTruthy();
  expect(screen.getByText(t.enums.messageStatus.failed)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/threads?page=1&pageSize=25');

  await fireEvent.press(screen.getByRole('button', { name: /أم إيمان/ }));
  expect(mockPush).toHaveBeenCalledWith(`/inbox/thread/${encodeURIComponent('+966552147731')}`);
});

test('unread and search go to the API', async () => {
  mockApiFetch.mockResolvedValue(threadsPage([guardian]));
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('أم إيمان');
  await fireEvent.press(screen.getByRole('tab', { name: t.inbox.filterUnread }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenLastCalledWith('/threads?unread=true&page=1&pageSize=25'));
  const field = screen.getByLabelText(t.inbox.searchPlaceholder);
  await fireEvent.changeText(field, '0552');
  await fireEvent(field, 'submitEditing');
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenLastCalledWith('/threads?search=0552&unread=true&page=1&pageSize=25'),
  );
});
