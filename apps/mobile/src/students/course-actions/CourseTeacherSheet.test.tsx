import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { pressEnabled } from '@/sales-course/testing/course-test-utils';
import { maryam, noAvailability } from '@/booking/testing/fixtures';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { NOW } from '@/sales-course/change/change-test-setup';
import { CourseActionsSection } from './CourseActionsSection';
import { BASE, serve, SUB } from './fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const c = t.courseActions;
const PATH = `${BASE}/course-teacher/change`;

beforeEach(() => {
  jest.clearAllMocks();
  fakeNow(NOW);
  mockApiFetch.mockImplementation(serve());
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === `${PATH}/check`
      ? { conflicts: [], remaining: 5, endsOn: '2026-10-29' }
      : { subscriptionId: SUB, ruleIds: ['r1'], endsOn: '2026-10-29' },
  );
});
afterEach(() => jest.useRealTimers());

const openTeacher = async () => {
  await renderWithQuery(<CourseActionsSection studentId="s1" subscriptionId={SUB} />);
  await fireEvent.press(await screen.findByRole('button', { name: c.teacher.action }));
};

test('the current teacher is named, never offered; same days go straight to the review', async () => {
  await openTeacher();
  expect(await screen.findByText(`${c.teacher.current}: ${maryam.display_name_ar}`)).toBeTruthy();
  expect(screen.queryByRole('button', { name: maryam.display_name_ar })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: noAvailability.display_name_ar }));
  await fireEvent.press(screen.getByRole('button', { name: c.teacher.keepDays }));
  const teacherId = noAvailability.id;
  const check = expect.objectContaining({ subscriptionId: SUB, teacherId, byday: [0, 4] });
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', `${PATH}/check`, check));
  await pressEnabled(t.booking.courseChange.submit);
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith(
      'POST',
      PATH,
      expect.objectContaining({ teacherId, clientRequestId: expect.any(String) }),
    ),
  );
  expect(await screen.findByText(t.booking.courseChange.done)).toBeTruthy();
});

test('a course that cannot be read says why', async () => {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith(PATH)) throw new ApiError(404, { code: 'subscription_not_found' });
    return serve()(path);
  });
  await openTeacher();
  expect(await screen.findByText(c.errors.subscription_not_found)).toBeTruthy();
});
