import { GRANTABLE_PERMISSIONS } from '@ab/catalog';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t, pathKey } from '@ab/mobile-kit';
import { localDay } from '@/payments';
import { fakeNow } from '@/test/fake-now';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { NOW, pauseState, pauseView } from '@/students/course-pause/fixtures';
import { profile } from '@/students/shared/test-data';
import { StudentScreen } from '@/students/screens/StudentScreen/StudentScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

const c = t.coursePause;
const serve = (state: ReturnType<typeof pauseState>) =>
  mockApi.onRead(async ({ path }) => {
    if (path === '/students/s1') return profile;
    if (path === '/students/s1/course-pause') return state;
    if (path.startsWith('/students/s1/course-pause/preview'))
      return { from_date: '2026-10-28', until_date: null, lessons: 0 };
    throw new ApiError(404);
  });

beforeEach(() => {
  mockApi.reset('read');
  fakeNow(NOW);
});
afterEach(() => jest.useRealTimers());

test("the admin's file: «إيقاف مؤقت» opens «إيقاف الدورة مؤقتًا»", async () => {
  serve(pauseState());
  await renderWithQuery(<StudentScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: c.action }));
  expect(await screen.findByRole('header', { name: c.title })).toBeTruthy();
  expect(await screen.findByText(c.preview.zero)).toBeTruthy();
});

test('paused: the banner instead of the action', async () => {
  serve(pauseState(pauseView()));
  await renderWithQuery(<StudentScreen />);
  expect(
    await screen.findByText(c.bannerUntil.replace('{date}', localDay('2026-11-10'))),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: c.action })).toBeNull();
  expect(screen.getByRole('button', { name: c.resume })).toBeTruthy();
});

test('without courses.pause: no action', async () => {
  serve(pauseState());
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), {
    role: 'admin',
    permissions: GRANTABLE_PERMISSIONS.filter((p) => p !== 'courses.pause'),
  });
  await renderWithQuery(<StudentScreen />, client);
  await screen.findByRole('header', { name: profile.name });
  await waitFor(() =>
    expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/students/s1/course-pause' }),
  );
  expect(screen.queryByRole('button', { name: c.action })).toBeNull();
});
