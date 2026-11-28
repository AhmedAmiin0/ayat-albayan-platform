import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { liveLesson } from '@/sales/sales/testing/fixtures';
import { SalesLiveScreen } from './SalesLiveScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

afterEach(() => jest.useRealTimers());
beforeEach(() => mockApi.reset('read'));

test('the lessons running now with students, teacher and «ادخل الحلقة»; a cancelled one is left out', async () => {
  fakeNow(new Date('2026-10-01T13:10:00Z'));
  mockApi.onRead(async ({ path }) =>
    path === '/sales/live'
      ? [liveLesson(), liveLesson({ lesson_id: 'l2', status: 'cancelled_by_admin' })]
      : {},
  );
  await renderWithQuery(<SalesLiveScreen />);
  expect(await screen.findByText(`${t.classroom.assistants.student} يوسف، جنى`)).toBeTruthy();
  expect(screen.getByText(`${t.classroom.assistants.teacher} أبرار محمد`)).toBeTruthy();
  expect(screen.getByText('16:00')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: t.classroom.enter })).toHaveLength(1);
});

test('nothing running shows the empty state; a failed read shows the error', async () => {
  mockApi.onRead(() => []);
  const first = await renderWithQuery(<SalesLiveScreen />);
  expect(await screen.findByText(t.sales.live.empty)).toBeTruthy();
  await first.unmount();
  mockApi.onRead(() => Promise.reject(new Error('offline')));
  await renderWithQuery(<SalesLiveScreen />);
  expect(await screen.findByText(t.sales.loadFailed)).toBeTruthy();
});
