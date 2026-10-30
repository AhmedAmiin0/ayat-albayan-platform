import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { details, weeklySlot } from './fixtures';
import { SalesStudentScreen } from './SalesStudentScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 'st1' }) }));
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

const s = t.sales.student;
const schedule = { student_tz: 'Asia/Riyadh', weekly: [weeklySlot], upcoming: [] };
const reports = { items: [], total: 0 };
const other = () =>
  details({ mine: false, subscriptions: [], current_id: null, reports, schedule });
beforeEach(() => {
  mockApiFetch.mockReset();
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

// Owner 2026-10-30: any student's schedule and full attendance log; money and reports: hers only.
test('another assistant\'s student: schedule, attendance and the full log; the reworded note; no package or report', async () => {
  mockApiFetch.mockResolvedValue(other());
  await open();
  expect(await screen.findByText(s.notMine)).toBeTruthy();
  expect(s.notMine).toContain('الجدول والحضور');
  expect(screen.getByRole('header', { name: s.schedule.title })).toBeTruthy();
  expect(screen.getByText('الأحد · الثلاثاء · الخميس الساعة 20:00')).toBeTruthy();
  expect(screen.getByText(s.attendance)).toBeTruthy();
  expect(screen.queryByText(s.subscription)).toBeNull();
  expect(screen.queryByText(t.reports.noReports)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: s.log.open }));
  expect(router.push).toHaveBeenCalledWith('/sales/students/st1/attendance');
});

test('one of hers: the same schedule and log, and her package; no «not one of yours» note', async () => {
  mockApiFetch.mockResolvedValue(details({ schedule }));
  await open();
  expect(await screen.findByText(s.current)).toBeTruthy();
  expect(screen.queryByText(s.notMine)).toBeNull();
  expect(screen.getByText('الأحد · الثلاثاء · الخميس الساعة 20:00')).toBeTruthy();
  expect(screen.getByRole('button', { name: s.log.open })).toBeTruthy();
});
