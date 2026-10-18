import { counted } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { booked, maryam, SUN_17, THU_18 } from '@/booking/fixtures';
import { dayLine } from '@/booking/picks';
import { t } from '@/lib/i18n';
import { localDay } from '@/payments/format';
import { renderWithQuery } from '@/test/query';
import { isDisabled, fakeCourseApi, press, walkToReview } from './course-test-utils';
import { CourseScreen } from './CourseScreen';
import { courseView, STUDENT_ID } from './fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams.current,
}));

const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = { studentId: STUDENT_ID };
  mockApiFetch.mockImplementation(fakeCourseApi().fetch);
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/booking/check' ? { conflicts: [] } : booked(SUN_17),
  );
});

test('a course she cannot book says why, and offers no wizard', async () => {
  mockApiFetch.mockImplementation(fakeCourseApi(courseView({ blocked: 'course_exists' })).fetch);
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.booking.courseBlocked.course_exists)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(`/sales/booking/course?studentId=${STUDENT_ID}`);
  expect(screen.queryByText(maryam.display_name_ar)).toBeNull();
});

test('teacher → exactly the plan’s days, each with its time → review → «احجز» posts the course', async () => {
  await renderWithQuery(<CourseScreen />);
  await fireEvent.press(await screen.findByText(maryam.display_name_ar));
  expect(await screen.findByText(t.booking.pickNDays.two)).toBeTruthy();
  const slots = mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).find((p) => p.startsWith('/sales/booking/slots'));
  expect(slots).toContain('durationMin=45'); // the subscription's length
  await press('checkbox', '17:00');
  expect(isDisabled(t.booking.next)).toBe(true); // one day of two
  await press('checkbox', '18:00');
  await press('button', t.booking.next);

  expect(await screen.findByText(dayLine(SUN_17, 'Asia/Riyadh'))).toBeTruthy();
  expect(screen.getByText(dayLine(THU_18, 'Asia/Riyadh'))).toBeTruthy();
  const ends = counted(t.booking.courseEnds, 8).replace('{date}', localDay('2026-10-29'));
  expect(screen.getByText(ends)).toBeTruthy();
  expect(await screen.findByText(t.booking.seriesFree)).toBeTruthy();
  await waitFor(() => expect(isDisabled(t.booking.submit)).toBe(false));
  await press('button', t.booking.submit);

  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  const [check] = sent('/sales/booking/check');
  const [post] = sent('/sales/booking');
  const body = {
    kind: 'package',
    studentIds: [STUDENT_ID],
    teacherId: maryam.id,
    byday: [0, 4],
    startTimeLocal: '17:00',
    dayTimes: [{ weekday: 4, startTimeLocal: '18:00' }],
    tz: 'Asia/Riyadh',
    durationMin: 45,
    package: '8',
  };
  expect(check?.[2]).toMatchObject(body);
  expect(post?.[2]).toMatchObject({ ...body, clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/) });
  expect(post?.[2]).not.toHaveProperty('invoice');
});

test('a clash in any week keeps «احجز» disabled (no override for the assistant)', async () => {
  mockApiSend.mockImplementation(async () => ({
    conflicts: [{ kind: 'teacher_busy', startsAt: '2026-10-22T15:00:00.000Z', endsAt: '2026-10-22T15:45:00.000Z' }],
  }));
  await renderWithQuery(<CourseScreen />);
  await walkToReview();
  expect(await screen.findByRole('button', { name: t.booking.changeSlot })).toBeTruthy();
  expect(isDisabled(t.booking.submit)).toBe(true);
  expect(sent('/sales/booking')).toHaveLength(0);
});

test('opened after «احفظ الاشتراك»: the transfer can come first, and follows the booking', async () => {
  mockParams.current = { studentId: STUDENT_ID, phone: '+966501112223', subscriptionId: 'sub-1' };
  const { router } = jest.requireMock<{ router: { replace: jest.Mock } }>('expo-router');
  await renderWithQuery(<CourseScreen />);
  await press('button', t.salesMoney.stepTransfer);
  const transfer = { pathname: '/inbox/sales-transfer', params: { phone: '+966501112223', subscriptionId: 'sub-1' } };
  expect(router.replace).toHaveBeenLastCalledWith(transfer);
  router.replace.mockClear();
  await walkToReview();
  await waitFor(() => expect(isDisabled(t.booking.submit)).toBe(false));
  await press('button', t.booking.submit);
  await press('button', t.salesMoney.stepTransfer);
  expect(router.replace).toHaveBeenLastCalledWith(transfer);
});
