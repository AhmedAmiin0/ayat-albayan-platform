import { counted, type PendingReportView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { refreshAfterSubmit } from '@/teacher/report/hooks/api';
import { renderWithQuery } from '@/test/query';
import { fileAnswers, fileLog } from './file-fixtures';
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

const pending = (lessonId: string, studentId: string): PendingReportView => ({
  lesson_id: lessonId,
  starts_at: '2026-11-06T15:00:00Z',
  status: 'scheduled',
  student: { id: studentId, code: 'AB-0182', name: studentId === 's1' ? 'يوسف أحمد' : 'سلمى' },
  report_id: null,
});

beforeEach(() => jest.clearAllMocks());

test('this student’s pending reports only, each opening its form', async () => {
  const rows = [pending('l-write', 's1'), pending('l-other', 's9')];
  mockApiFetch.mockImplementation(fileAnswers({ pending: rows }));
  await renderWithQuery(<TeacherStudentFileScreen />);
  expect(await screen.findByText(counted(t.reports.pendingCount, 1))).toBeTruthy();
  expect(screen.queryByText('سلمى')).toBeNull();
  // The pending row comes first; the log's own row offers the same «اكتب التقرير».
  const [first] = screen.getAllByText(t.reports.open);
  if (!first) throw new Error('no pending row');
  await fireEvent.press(first);
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/l-write');
});

test('many pending: the oldest two rows under the full count, so the lessons keep the screen', async () => {
  const rows = ['p1', 'p2', 'p3', 'p4'].map((id) => pending(id, 's1'));
  mockApiFetch.mockImplementation(fileAnswers({ pending: rows }));
  await renderWithQuery(<TeacherStudentFileScreen />);
  expect(await screen.findByText(counted(t.reports.pendingCount, 4))).toBeTruthy();
  // Two pending rows, plus the log's one unwritten row.
  expect(screen.getAllByText(t.reports.open)).toHaveLength(3);
});

test('after a submit and back, the row reads «تعديل التقرير» (refreshAfterSubmit)', async () => {
  const file = fileAnswers();
  let submitted = false;
  mockApiFetch.mockImplementation(async (p: string) => {
    if (!submitted || !p.includes('/attendance')) return file(p);
    const log = fileLog();
    const items = log.items.map((r) =>
      r.lesson_id === 'l-write'
        ? { ...r, report_sent: true, report: { status: 'submitted', submitted_at: null, sent_at: null, can_edit: true, edit_until: '2026-11-11T12:30:00Z' } }
        : r,
    );
    return { ...log, items };
  });
  const { client } = await renderWithQuery(<TeacherStudentFileScreen />);
  expect(await screen.findByText(t.teacherBoard.writeReport)).toBeTruthy();
  submitted = true;
  await refreshAfterSubmit(client);
  await waitFor(() => expect(screen.getAllByText(t.reports.edit)).toHaveLength(2));
  expect(screen.queryByText(t.teacherBoard.writeReport)).toBeNull();
});
