import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { monthOf } from '@/sales/sales';
import { renderWithQuery } from '@/test/query';
import { fileAnswers } from './file-fixtures';
import { TeacherStudentFileScreen } from './TeacherStudentFileScreen';

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
jest.mock('@/core/lib/time/use-now', () => ({ useNow: () => new Date('2026-11-11T12:00:00Z') }));
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

const log = t.sales.student.log;
const before = (text: string) => new RegExp(text.split('{')[0] ?? text);

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(fileAnswers());
});

test('opens on «الحلقات»: the next 14 days, a moved one with its new time and reason', async () => {
  await renderWithQuery(<TeacherStudentFileScreen />);
  expect(await screen.findByText(t.teacherFile.upcoming)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/students/s1');
  expect(screen.getByText(before(log.movedTo))).toBeTruthy();
  // The column header over the upcoming rows, and again over the month's.
  await screen.findByText(log.cancelReason.replace('{reason}', 'اعتذار الأسرة'));
  expect(screen.getAllByText(log.columns.report)).toHaveLength(2);
  await fireEvent.press(screen.getByText(log.moveReason.replace('{reason}', 'سفر الأسرة')));
  expect(mockPush).not.toHaveBeenCalled();
});

test('the month log: outcomes, the cancel and move reasons, the report action per row', async () => {
  await renderWithQuery(<TeacherStudentFileScreen />);
  expect(await screen.findByText(log.cancelReason.replace('{reason}', 'اعتذار الأسرة'))).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/students/s1/attendance');
  expect(screen.getByText(before(log.movedFrom))).toBeTruthy();
  expect(screen.getByText(log.moveReason.replace('{reason}', 'مرض المعلمة'))).toBeTruthy();
  expect(screen.getAllByText(t.reports.edit)).toHaveLength(1);
  expect(screen.getAllByText(t.reports.view)).toHaveLength(2);
  expect(screen.getAllByText(t.teacherBoard.writeReport)).toHaveLength(1);
});

test('an unwritten reportable row opens its form; a cancelled one opens nothing', async () => {
  await renderWithQuery(<TeacherStudentFileScreen />);
  await fireEvent.press(await screen.findByText(log.cancelReason.replace('{reason}', 'اعتذار الأسرة')));
  expect(mockPush).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText(t.teacherBoard.writeReport));
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/l-write');
  await fireEvent.press(screen.getByText(t.reports.edit));
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/l-edit');
});

test('a month pill reads that month in her zone', async () => {
  await renderWithQuery(<TeacherStudentFileScreen />);
  await fireEvent.press(await screen.findByRole('tab', { name: monthOf('2026-10') }));
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/students/s1/attendance?month=2026-10');
});
