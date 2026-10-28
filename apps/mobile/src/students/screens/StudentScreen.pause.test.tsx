import { GRANTABLE_PERMISSIONS } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { localDay } from '@/payments';
import { fakeNow } from '@/test/fake-now';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { NOW, pauseState, pauseView } from '../course-pause/fixtures';
import { profile } from '../shared/test-data';
import { StudentScreen } from './StudentScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

const c = t.coursePause;
const serve = (state: ReturnType<typeof pauseState>) => mockApiFetch.mockImplementation(async (path: string) => {
  if (path === '/students/s1') return profile;
  if (path === '/students/s1/course-pause') return state;
  if (path.startsWith('/students/s1/course-pause/preview')) return { from_date: '2026-10-28', until_date: null, lessons: 0 };
  throw new ApiError(404);
});

beforeEach(() => {
  mockApiFetch.mockReset();
  fakeNow(NOW);
});
afterEach(() => jest.useRealTimers());

test('the admin\'s file: «إيقاف مؤقت» opens «إيقاف الدورة مؤقتًا»', async () => {
  serve(pauseState());
  await renderWithQuery(<StudentScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: c.action }));
  expect(await screen.findByRole('header', { name: c.title })).toBeTruthy();
  expect(await screen.findByText(c.preview.zero)).toBeTruthy();
});

test('paused: the banner instead of the action', async () => {
  serve(pauseState(pauseView()));
  await renderWithQuery(<StudentScreen />);
  expect(await screen.findByText(c.bannerUntil.replace('{date}', localDay('2026-11-10')))).toBeTruthy();
  expect(screen.queryByRole('button', { name: c.action })).toBeNull();
  expect(screen.getByRole('button', { name: c.resume })).toBeTruthy();
});

test('without courses.pause: no action', async () => {
  serve(pauseState());
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role: 'admin', permissions: GRANTABLE_PERMISSIONS.filter((p) => p !== 'courses.pause') });
  await renderWithQuery(<StudentScreen />, client);
  await screen.findByRole('header', { name: profile.name });
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/students/s1/course-pause'));
  expect(screen.queryByRole('button', { name: c.action })).toBeNull();
});
