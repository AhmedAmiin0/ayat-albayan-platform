import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import TodayRoute from '../../app/(tabs)/index';
import { cancelled, done, muscat, pending } from './fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const dayKey = ['lessons', 'day', { date: '2026-10-01', tz: 'Asia/Riyadh' }];

beforeEach(() => {
  mockApiFetch.mockReset();
  // Thursday 1 Oct 2026, 16:20 in Riyadh.
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('Amiri «النهارده» header, the Riyadh date line, and today in Riyadh is what it asks for', async () => {
  mockApiFetch.mockResolvedValue([]);
  await renderWithQuery(<TodayRoute />);
  expect(screen.getByRole('header', { name: t.today.title })).toBeTruthy();
  expect(screen.getByText('الخميس 1 أكتوبر 2026. المواعيد بتوقيت الرياض')).toBeTruthy();
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenCalledWith('/lessons/day?date=2026-10-01&tz=Asia%2FRiyadh'),
  );
});

test('the spine: ended lessons compact, the now-line, then cards with codes and both clocks', async () => {
  mockApiFetch.mockResolvedValue([muscat, cancelled, pending, done]);
  await renderWithQuery(<TodayRoute />);
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  expect(screen.getByText(`جودى خالد ${t.today.withTeacher.replace('{teacher}', 'أبرار')}`)).toBeTruthy();
  expect(screen.getByText(t.enums.lessonStatus.completed)).toBeTruthy();
  expect(screen.getByLabelText(`${t.today.now} 16:20`)).toBeTruthy();
  expect(screen.getByText(ltr('AB-0182'))).toBeTruthy();
  expect(screen.getByText(ltr('AB-0185'))).toBeTruthy();
  expect(screen.getByText('مع أبرار · 45 دقيقة')).toBeTruthy();
  expect(screen.getByText(`مع أبرار · ${t.enums.duration['60']} · 18:00 بتوقيت مسقط`)).toBeTruthy();
  for (const time of ['10:00', '16:00', '17:00']) expect(screen.getByText(time)).toBeTruthy();
  // The cancelled lesson (also 16:00) is hidden: one 16:00 on the spine.
  expect(screen.getAllByText('16:00')).toHaveLength(1);
  expect(screen.getByText(t.enums.lessonStatus.scheduled)).toBeTruthy();
});

test('pills count the returned day and filter it on the phone', async () => {
  mockApiFetch.mockResolvedValue([done, pending, muscat, cancelled]);
  await renderWithQuery(<TodayRoute />);
  expect(await screen.findByRole('tab', { name: `${t.today.all} 3` })).toBeTruthy();
  expect(screen.getByRole('tab', { name: `${t.enums.lessonStatus.scheduled} 1` })).toBeTruthy();
  expect(screen.getByRole('tab', { name: `${t.enums.lessonStatus.confirmed} 1` })).toBeTruthy();
  expect(screen.getByRole('tab', { name: `${t.enums.lessonStatus.completed} 1` })).toBeTruthy();

  await fireEvent.press(screen.getByRole('tab', { name: `${t.enums.lessonStatus.confirmed} 1` }));
  expect(screen.getByText('جنى وليد')).toBeTruthy();
  expect(screen.queryByText('يوسف أحمد')).toBeNull();
  expect(mockApiFetch).toHaveBeenCalledTimes(1);
});

test('only open lessons get actions: تأكيد where it can still be confirmed, إلغاء on both', async () => {
  mockApiFetch.mockResolvedValue([done, pending, muscat]);
  await renderWithQuery(<TodayRoute />);
  await screen.findByText('يوسف أحمد');
  expect(screen.getAllByRole('button', { name: t.today.confirm })).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: t.today.cancel })).toHaveLength(2);
});

test('no lessons today: the Today empty state; an empty filter says so', async () => {
  mockApiFetch.mockResolvedValue([done]);
  await renderWithQuery(<TodayRoute />);
  await fireEvent.press(await screen.findByRole('tab', { name: `${t.enums.lessonStatus.scheduled} 0` }));
  expect(screen.getByRole('header', { name: t.today.emptyFilter })).toBeTruthy();
  expect(screen.queryByLabelText(`${t.today.now} 16:20`)).toBeNull();

  mockApiFetch.mockResolvedValue([]);
  await renderWithQuery(<TodayRoute />);
  expect(await screen.findByRole('header', { name: t.today.empty })).toBeTruthy();
});

test('failed with nothing saved: error and retry', async () => {
  mockApiFetch.mockRejectedValueOnce(new ApiError(500)).mockResolvedValue([pending]);
  await renderWithQuery(<TodayRoute />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
});

test('offline with a saved day: lessons stay, no error, and «آخر تحديث» says how old', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(503));
  const client = createTestQueryClient();
  client.setQueryData(dayKey, [pending]);
  await renderWithQuery(<TodayRoute />, client);
  expect(screen.getByText('يوسف أحمد')).toBeTruthy();
  expect(await screen.findByText(new RegExp(t.mobile.lastUpdated.replace(' {time}', '')))).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('pull to refresh asks the API again', async () => {
  mockApiFetch.mockResolvedValue([pending]);
  const { container } = await renderWithQuery(<TodayRoute />);
  await screen.findByText('يوسف أحمد');
  const [list] = container.queryAll((node) => typeof node.props['onRefresh'] === 'function');
  if (!list) throw new Error('no pull-to-refresh on the list');
  await fireEvent(list, 'refresh');
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
});
