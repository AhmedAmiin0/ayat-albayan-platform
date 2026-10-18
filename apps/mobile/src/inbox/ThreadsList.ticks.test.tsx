import type { ThreadView } from '@ab/shared';
import { screen, within } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { InboxScreen } from './InboxScreen';
import { thread } from './thread-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// Like WhatsApp's chat list: ticks before the preview only when the last message is ours.
const ours: ThreadView = { ...thread, display_name: 'أم سارة', last_status: 'read', last_body: 'أهلًا' };
const theirs: ThreadView = {
  ...thread,
  phone_e164: '+966552147731',
  display_name: 'أم إيمان',
  last_direction: 'inbound',
  last_body: 'شكرًا',
  unread_count: 1,
};
const page = (items: ThreadView[]) => ({ items, total: items.length, page: 1, pageSize: 25 });
const row = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

beforeEach(() => mockApiFetch.mockReset());

test('our last message carries its ticks, named by the status word', async () => {
  mockApiFetch.mockResolvedValue(page([ours, theirs]));
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('أم سارة');
  const ticks = within(row('أم سارة')).getByLabelText(t.enums.messageStatus.read);
  expect(ticks.props.testID).toBe('ticks-read');
});

test('their last message shows no ticks; the unread chip stays', async () => {
  mockApiFetch.mockResolvedValue(page([theirs]));
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('أم إيمان');
  expect(screen.queryByTestId(/^ticks-/)).toBeNull();
  expect(screen.getByText(t.inbox.unread.one)).toBeTruthy();
});

test('a failed last send: the red «!» before the preview, and the «لم تُرسل» chip', async () => {
  mockApiFetch.mockResolvedValue(page([{ ...ours, last_status: 'failed' }]));
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('أم سارة');
  expect(screen.getByLabelText(t.enums.messageStatus.failed).props.testID).toBe('ticks-failed');
  expect(screen.getByText(t.enums.messageStatus.failed)).toBeTruthy();
});
