import { RIYADH_TZ } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { clockIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { renderWithQuery } from '@/test/query';
import { AttendanceLogScreen } from './AttendanceLogScreen';
import { dayDateOf, monthOf } from './attendance-log-text';
import { logTable } from './fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 'st1' }) }));
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

const w = t.sales.student.log;
const inSales = (node: ReactElement) => renderWithQuery(<TreeBaseProvider value="/sales">{node}</TreeBaseProvider>);
beforeEach(() => mockApiFetch.mockReset());

test('the table: column header, one row per lesson (Riyadh day, 24 h time, teacher, chip, report), tags and the cancel reason', async () => {
  mockApiFetch.mockResolvedValue(logTable());
  await inSales(<AttendanceLogScreen />);
  await screen.findByText(w.sent);
  for (const c of [w.columns.date, w.columns.time, w.columns.teacher, w.columns.status, w.columns.report]) expect(screen.getByText(c)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/students/st1/attendance');
  expect(screen.getByText(dayDateOf('2026-10-27T15:00:00.000Z'))).toBeTruthy();
  expect(screen.getAllByText(clockIn(new Date('2026-10-27T15:00:00.000Z'), RIYADH_TZ, '24'))).toHaveLength(3);
  expect(screen.getAllByText('أبرار محمد')).toHaveLength(3);
  expect(screen.getByText(w.sent)).toBeTruthy();
  expect(screen.getAllByText(w.notSent)).toHaveLength(2);
  expect(screen.getByText(`${w.makeup} · ${w.late}`)).toBeTruthy();
  expect(screen.getByText(w.cancelReason.replace('{reason}', 'سفر المعلمة'))).toBeTruthy();
  expect(screen.getByText(t.enums.lessonStatus.cancelled_by_teacher)).toBeTruthy();
});

test('the totals row: حضر · غاب · بعذر · متأخر · ألغيت · أُجّلت', async () => {
  mockApiFetch.mockResolvedValue(logTable());
  await inSales(<AttendanceLogScreen />);
  expect(await screen.findByText(`${w.totals.held} 2`)).toBeTruthy();
  for (const line of [`${w.totals.absent} 0`, `${w.totals.excused} 0`, `${w.totals.late} 1`, `${w.totals.cancelled} 1`, `${w.totals.rescheduled} 0`]) {
    expect(screen.getByText(line)).toBeTruthy();
  }
});

test('the month pills, newest first: a tap reads that month', async () => {
  mockApiFetch.mockImplementation(async (path: string) =>
    path.endsWith('month=2026-09') ? logTable({ month: '2026-09', items: [] }) : logTable(),
  );
  await inSales(<AttendanceLogScreen />);
  const pills = await screen.findAllByRole('tab');
  expect(pills.map((p) => p.props.accessibilityState.selected)).toEqual([true, false]);
  await fireEvent.press(screen.getByRole('tab', { name: monthOf('2026-09') }));
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/students/st1/attendance?month=2026-09');
  expect(await screen.findByText(w.empty)).toBeTruthy();
});

test('a month without lessons: the empty state under the header', async () => {
  mockApiFetch.mockResolvedValue(logTable({ items: [], months: ['2026-10'] }));
  await inSales(<AttendanceLogScreen />);
  expect(await screen.findByText(w.empty)).toBeTruthy();
  expect(screen.getByText(w.columns.date)).toBeTruthy();
});
