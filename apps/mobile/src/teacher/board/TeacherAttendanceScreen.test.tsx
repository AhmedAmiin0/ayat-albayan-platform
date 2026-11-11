import { fireEvent, screen } from '@testing-library/react-native';
import { zoneNote } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { logTable } from '@/sales/sales/attendance/fixtures';
import { renderWithQuery } from '@/test/query';
import { TeacherAttendanceScreen } from './TeacherAttendanceScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (h: string) => mockPush(h),
    back: jest.fn(),
    canDismiss: () => true,
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: 's1' }),
}));
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

const log = t.sales.student.log;
beforeEach(() => jest.clearAllMocks());

test('her own lessons with the student: the C5 path, the totals and the rows', async () => {
  mockApiFetch.mockResolvedValue(logTable());
  await renderWithQuery(<TeacherAttendanceScreen />);
  expect(await screen.findByText(log.sent)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/students/s1/attendance');
  expect(screen.getByRole('header', { name: t.teacherBoard.attendanceLog })).toBeTruthy();
  expect(screen.getByText(`${log.totals.held} 2`)).toBeTruthy();
  expect(screen.getAllByText(log.notSent)).toHaveLength(2);
});

test('a month pill reads that month; a row with a report opens my report form', async () => {
  mockApiFetch.mockImplementation(async (p: string) =>
    p.endsWith('month=2026-09') ? logTable({ month: '2026-09', items: [] }) : logTable(),
  );
  await renderWithQuery(<TeacherAttendanceScreen />);
  await fireEvent.press(await screen.findByText(log.sent));
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/l1');
  const [, september] = screen.getAllByRole('tab');
  if (!september) throw new Error('no second month');
  await fireEvent.press(september);
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/students/s1/attendance?month=2026-09');
  expect(await screen.findByText(log.empty)).toBeTruthy();
});

test('a failed read offers a retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<TeacherAttendanceScreen />);
  expect(await screen.findByRole('button', { name: t.mobile.retry })).toBeTruthy();
});

test("months and dates in one zone: hers (teachers.tz), not the viewer's (review 11-11)", async () => {
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/teachers/me' ? { id: 't1', tz: 'Asia/Tokyo', students: [] } : logTable(),
  );
  await renderWithQuery(<TeacherAttendanceScreen />);
  expect(await screen.findByText(zoneNote('Asia/Tokyo'))).toBeTruthy();
  // 15:00Z is 00:00 the next day in Tokyo.
  expect(screen.getAllByText('00:00').length).toBeGreaterThan(0);
});
