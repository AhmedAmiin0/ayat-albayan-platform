import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { liveLesson } from './fixtures';
import { SalesLiveScreen } from './SalesLiveScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

afterEach(() => jest.useRealTimers());
beforeEach(() => mockApiFetch.mockReset());

test('the lessons running now with students, teacher and «ادخل الحلقة»; a cancelled one is left out', async () => {
  fakeNow(new Date('2026-10-01T13:10:00Z'));
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/sales/live' ? [liveLesson(), liveLesson({ lesson_id: 'l2', status: 'cancelled_by_admin' })] : {},
  );
  await renderWithQuery(<SalesLiveScreen />);
  expect(await screen.findByText(`${t.classroom.assistants.student} يوسف، جنى`)).toBeTruthy();
  expect(screen.getByText(`${t.classroom.assistants.teacher} أبرار محمد`)).toBeTruthy();
  expect(screen.getByText('16:00')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: t.classroom.enter })).toHaveLength(1);
});

test('nothing running shows the empty state; a failed read shows the error', async () => {
  mockApiFetch.mockResolvedValue([]);
  const first = await renderWithQuery(<SalesLiveScreen />);
  expect(await screen.findByText(t.sales.live.empty)).toBeTruthy();
  await first.unmount();
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<SalesLiveScreen />);
  expect(await screen.findByText(t.sales.loadFailed)).toBeTruthy();
});
