import en from '@ab/shared/i18n/en.json';
import type { ThreadView } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { readable, SHOWN } from './screens/privacy.helpers';
import { ThreadModeProvider } from './thread/hooks/thread-mode';
import { ThreadsList } from './ThreadsList';
import { thread } from './shared/thread-fixtures';

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

const family: ThreadView = { ...thread, guardian_id: 'g-1', lead_id: null, lead_status: null, lead_source: null };

test('an LTR teacher run: named and unnamed threads never show the number', async () => {
  const unnamed: ThreadView = { ...family, phone_e164: '+966552147731', display_name: null };
  mockApiFetch.mockResolvedValue({ items: [{ ...family, display_name: 'Umm Yusuf' }, unnamed], total: 2, page: 1, pageSize: 25 });
  await renderWithQuery(
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't-1' }}>
      <ThreadsList />
    </ThreadModeProvider>,
  );
  await screen.findByText('Umm Yusuf');
  expect(screen.getByText(en.inbox.kind.guardian)).toBeTruthy();
  for (const s of [...SHOWN, '7731']) expect(readable()).not.toContain(s);
});
