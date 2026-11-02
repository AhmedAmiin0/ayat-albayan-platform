import { GRANTABLE_PERMISSIONS, selfPermissionsOf } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { fakeNow } from '@/test/fake-now';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { details } from './fixtures';
import { SalesStudentScreen } from './SalesStudentScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 'st1' }) }));

const c = t.coursePause;
const OPEN = { id: 'p1', from_date: '2026-10-28', until_date: null, reason: null, created_at: '2026-10-28T08:00:00.000Z', created_by_name: null, resumed_at: null, extended_days: null };
const serve = (input: { mine: boolean; open: typeof OPEN | null }) => mockApiFetch.mockImplementation(async (path: string) => {
  if (path === '/sales/students/st1') return details({ mine: input.mine });
  if (path === '/students/st1/course-pause') return { open: input.open, history: [] };
  if (path.startsWith('/students/st1/course-pause/preview')) return { from_date: '2026-10-28', until_date: null, lessons: 1 };
  throw new ApiError(404);
});
const asSales = (permissions: string[]) => {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions: [...permissions, ...selfPermissionsOf('sales')] });
  return client;
};

beforeEach(() => {
  mockApiFetch.mockReset();
  fakeNow(new Date('2026-10-28T09:00:00.000Z'));
});
afterEach(() => jest.useRealTimers());

test('another family\'s student too: «إيقاف مؤقت» with courses.pause opens the sheet', async () => {
  serve({ mine: false, open: null });
  await renderWithQuery(<SalesStudentScreen />, asSales([...GRANTABLE_PERMISSIONS]));
  await fireEvent.press(await screen.findByRole('button', { name: c.action }));
  expect(await screen.findByText(c.preview.one)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students/st1/course-pause/preview?from=2026-10-28');
});

test('paused: the banner with «استئناف»', async () => {
  serve({ mine: true, open: OPEN });
  await renderWithQuery(<SalesStudentScreen />, asSales([...GRANTABLE_PERMISSIONS]));
  expect(await screen.findByText(c.bannerOpen)).toBeTruthy();
  expect(screen.getByRole('button', { name: c.resume })).toBeTruthy();
  expect(screen.queryByRole('button', { name: c.action })).toBeNull();
});

test('without courses.pause: no action', async () => {
  serve({ mine: true, open: null });
  await renderWithQuery(<SalesStudentScreen />, asSales(GRANTABLE_PERMISSIONS.filter((p) => p !== 'courses.pause')));
  await screen.findByRole('header', { name: 'يوسف أحمد' });
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/students/st1/course-pause'));
  expect(screen.queryByRole('button', { name: c.action })).toBeNull();
});
