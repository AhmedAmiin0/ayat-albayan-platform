import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { GRANTABLE_PERMISSIONS, selfPermissionsOf } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { fakeNow } from '@/test/fake-now';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { scheduleLesson, teacher } from '../testing/fixtures';
import { SalesScheduleScreen } from '../screens/SalesScheduleScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({}) }));

// «Now» Thursday 1 Oct 16:20 Riyadh. يوسف at 19:00 is ANOTHER family's lesson, still scheduled.
const NOW = new Date('2026-10-01T13:20:00Z');
const OTHERS = scheduleLesson({ id: 'l3', starts_at: '2026-10-01T16:00:00.000Z', ends_at: '2026-10-01T16:45:00.000Z', status: 'scheduled' });
const a = t.sales.lessonActions;
const day = (lessons: unknown[]) => async (path: string) => (path === '/sales/teachers' ? [teacher()] : { date: '2026-10-01', lessons });

beforeEach(() => {
  mockApiFetch.mockReset().mockImplementation(day([OTHERS]));
  mockApiSend.mockReset();
  fakeNow(NOW);
});
afterEach(() => jest.useRealTimers());

const open = async (client = createTestQueryClient()) => {
  await renderWithQuery(<SalesScheduleScreen />, client);
  await fireEvent.press(await screen.findByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', 'يوسف أحمد') }));
  await screen.findByRole('header', { name: 'يوسف أحمد' });
};

test('any scheduled lesson (not hers): «تأكيد الحلقة», then it reads «مؤكدة»; no move or cancel', async () => {
  mockApiSend.mockResolvedValue({ id: 'l3', starts_at: OTHERS.starts_at, status: 'confirmed' });
  await open();
  expect(screen.queryByText(t.lessons.sheet.readOnly)).toBeNull();
  expect(screen.queryByRole('button', { name: a.reschedule })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: a.confirm }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l3/confirm'));
  expect(await screen.findByText(a.confirmed)).toBeTruthy();
  expect(screen.getByText(t.enums.lessonStatus.confirmed)).toBeTruthy();
  expect(screen.queryByRole('button', { name: a.confirm })).toBeNull();
});

test.each([
  ['confirmed', { ...OTHERS, status: 'confirmed' }],
  ['ended', { ...OTHERS, starts_at: '2026-10-01T12:00:00.000Z', ends_at: '2026-10-01T12:45:00.000Z' }],
])('a %s lesson offers no confirm and stays «للاطلاع فقط»', async (_kind, lesson) => {
  mockApiFetch.mockImplementation(day([lesson]));
  await open();
  expect(screen.queryByRole('button', { name: a.confirm })).toBeNull();
  expect(screen.getByText(t.lessons.sheet.readOnly)).toBeTruthy();
});

test('without lessons.confirm the button is not there', async () => {
  const client = createTestQueryClient({ meFromApi: true });
  client.setQueryDefaults(pathKey('/auth/me'), { staleTime: Infinity });
  client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions: [...GRANTABLE_PERMISSIONS.filter((p) => p !== 'lessons.confirm'), ...selfPermissionsOf('sales')] });
  await open(client);
  expect(screen.queryByRole('button', { name: a.confirm })).toBeNull();
});

test.each([
  ['lesson_ended', a.confirmEnded],
  ['invalid_transition', a.confirmInvalid],
])('a %s refusal reads in the confirm\'s words; nothing is shown confirmed', async (code, text) => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code }));
  await open();
  await fireEvent.press(screen.getByRole('button', { name: a.confirm }));
  expect(await screen.findByText(text)).toBeTruthy();
  expect(screen.queryByText(a.confirmed)).toBeNull();
});
