import en from '@ab/shared/i18n/en.json';
import type { ThreadView } from '@ab/shared';
import { screen, within } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { InboxScreen } from './InboxScreen';
import { thread } from './thread-fixtures';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const teacher: ThreadView = {
  ...thread,
  phone_e164: '+201066000001',
  display_name: 'Fatma',
  teacher_id: 't-1',
  lead_source: null,
};

test('an LTR run tags threads with the en.json words', async () => {
  const lead: ThreadView = { ...thread, lead_status: 'interested_no_slot', unread_count: 1 };
  mockApiFetch.mockResolvedValue({ items: [lead, teacher], total: 2, page: 1, pageSize: 25 });
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('هدى سالم');

  const row = within(screen.getByRole('button', { name: /هدى سالم/ }));
  expect(row.getByText(en.enums.leadStatus.interested_no_slot)).toBeTruthy();
  expect(row.getByText(en.enums.leadSource.facebook_ad)).toBeTruthy();
  expect(row.getByText(en.inbox.unread.one)).toBeTruthy();
  expect(screen.getByText(en.inbox.kind.teacher)).toBeTruthy();
});
