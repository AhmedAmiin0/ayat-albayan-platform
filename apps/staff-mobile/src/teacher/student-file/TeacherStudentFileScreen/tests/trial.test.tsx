import { screen } from '@testing-library/react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { fileAnswers, head } from '@/teacher/student-file/file-fixtures';
import { TeacherStudentFileScreen } from '@/teacher/student-file/TeacherStudentFileScreen/TeacherStudentFileScreen';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
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
jest.mock('@ab/mobile-kit/lib/time/use-now', () => ({ useNow: () => new Date('2026-11-11T12:00:00Z') }));
jest.mock('@ab/mobile-kit/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

beforeEach(() => jest.clearAllMocks());

test('a trial student’s file: the «through sales» note, from the head’s status', async () => {
  mockApiFetch.mockImplementation(fileAnswers({ head: head({ status: 'trial' }) }));
  await renderWithQuery(<TeacherStudentFileScreen />);
  expect(await screen.findByText(t.teacherDash.trialChatViaSales)).toBeTruthy();
});

test('an active student’s file: name, code and status, the course; no note', async () => {
  mockApiFetch.mockImplementation(fileAnswers());
  await renderWithQuery(<TeacherStudentFileScreen />);
  expect(await screen.findByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  expect(screen.getByText(new RegExp(t.enums.studentStatus.active))).toBeTruthy();
  expect(screen.getByText(t.teacherFile.courseEndsAfter.few.replace('{n}', '3'))).toBeTruthy();
  expect(screen.queryByText(t.teacherDash.trialChatViaSales)).toBeNull();
});

test('a student who is not hers (404): «غير مسموح»', async () => {
  const file = fileAnswers();
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/teachers/me/students/s1') throw new ApiError(404, { code: 'student_not_found' });
    return file(p);
  });
  await renderWithQuery(<TeacherStudentFileScreen />);
  expect(await screen.findByText(t.common.forbidden)).toBeTruthy();
});
