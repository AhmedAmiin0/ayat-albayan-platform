import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { details, weeklySlot } from '@/sales/sales/student/fixtures';
import { SalesStudentScreen } from '@/sales/sales/student/SalesStudentScreen/SalesStudentScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'st1' }),
}));
jest.mock('@ab/mobile-kit/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

const s = t.sales.student;
const schedule = { student_tz: 'Asia/Riyadh', weekly: [weeklySlot], upcoming: [] };
const reports = { items: [], total: 0 };
const other = () =>
  details({ mine: false, subscriptions: [], current_id: null, reports, schedule });
beforeEach(() => {
  mockApi.reset('read');
  jest.mocked(router.push).mockClear();
  fakeNow(new Date('2026-10-27T10:00:00Z'));
});
afterEach(() => jest.useRealTimers());

const open = () =>
  renderWithQuery(
    <TreeBaseProvider value="/sales">
      <SalesStudentScreen />
    </TreeBaseProvider>,
  );

// Any student's schedule and full attendance log, without any «not yours» note.
test("another assistant's student: schedule, attendance and the full log; no note", async () => {
  mockApi.onRead(() => other());
  await open();
  expect(await screen.findByRole('header', { name: s.schedule.title })).toBeTruthy();
  expect(screen.getByText('الأحد · الثلاثاء · الخميس الساعة 20:00')).toBeTruthy();
  expect(screen.getByText(s.attendance)).toBeTruthy();
  expect(screen.queryByText(/ليس من طلابك/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: s.log.open }));
  expect(router.push).toHaveBeenCalledWith('/sales/students/st1/attendance');
});

test('one of hers: the same schedule and log, and her package', async () => {
  mockApi.onRead(() => details({ schedule }));
  await open();
  expect(await screen.findByText(s.current)).toBeTruthy();
  expect(screen.getByText('الأحد · الثلاثاء · الخميس الساعة 20:00')).toBeTruthy();
  expect(screen.getByRole('button', { name: s.log.open })).toBeTruthy();
});
