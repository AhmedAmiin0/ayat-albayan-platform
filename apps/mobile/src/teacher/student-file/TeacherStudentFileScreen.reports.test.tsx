import type { ReportSummaryView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
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

const report: ReportSummaryView = {
  id: 'r1',
  lesson_id: 'l-edit',
  starts_at: '2026-11-10T15:00:00Z',
  lesson_no: 5,
  teacher: { id: 't-abrar', display_name_ar: 'أبرار' },
  attendance: 'on_time',
  grade_overall: 'excellent',
  status: 'submitted',
  version: 1,
  pdf_status: 'ready',
  sent_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  const file = fileAnswers();
  mockApiFetch.mockImplementation(async (p: string) =>
    p.startsWith('/students/s1/reports')
      ? { items: [report], total: 1, page: 1, pageSize: 10, series: [] }
      : file(p),
  );
});

test('«التقارير»: read only once chosen; her own report opens its form', async () => {
  await renderWithQuery(<TeacherStudentFileScreen />);
  const tab = await screen.findByRole('tab', { name: t.teacherBoard.reportsTab });
  const reads = () => mockApiFetch.mock.calls.filter(([p]) => String(p).startsWith('/students/'));
  expect(reads()).toHaveLength(0);
  await fireEvent.press(tab);
  await fireEvent.press(await screen.findByText(new RegExp(t.enums.grade.excellent)));
  expect(mockApiFetch).toHaveBeenCalledWith('/students/s1/reports?page=1&pageSize=10');
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/l-edit');
  expect(screen.getByText(t.mobileStudentFile.recordings.button)).toBeTruthy();
});
