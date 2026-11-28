import type { SalesCourseView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { bookedCourse, courseView } from '@/sales-course/testing/fixtures';
import { renderWithQuery } from '@/test/query';
import { familyOf, KID, kid, PHONE } from '@/sales-subscribe/testing/fixtures';
import { SalesSubscribeScreen } from '@/sales-subscribe/screens/SalesSubscribeScreen/SalesSubscribeScreen';
import { mockCall } from '@ab/testing/mock-call';

// Lesson days for the resolved child while GET /sales/booking/course allows booking its package.
const mockApi = mockCall();
mockApi.onWrite(() =>
  Promise.resolve(jest.requireActual('@/sales-subscribe/testing/fixtures').salesQuote),
);
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
const mockPush = jest.fn();
const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: () => true,
    replace: jest.fn(),
    push: (h: unknown) => mockPush(h),
  },
  useLocalSearchParams: () => mockParams.current,
}));

const serve = (course: SalesCourseView) =>
  mockApi.onRead(async ({ path }) =>
    path.startsWith('/sales/booking/course') ? course : familyOf(kid()),
  );

beforeEach(() => {
  jest.clearAllMocks();
  serve(courseView());
});

test('a preselected child of hers: «أيام الحلقات» opens the course wizard for that child', async () => {
  mockParams.current = { phone: PHONE, studentId: KID };
  await renderWithQuery(<SalesSubscribeScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.booking.courseDays }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/inbox/sales-course',
    params: { studentId: KID },
  });
});

test('the only child, from the chat strip (no studentId): «أيام الحلقات» too', async () => {
  mockParams.current = { phone: PHONE };
  await renderWithQuery(<SalesSubscribeScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.booking.courseDays }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/inbox/sales-course',
    params: { studentId: KID },
  });
});

test('the course is booked already: no «أيام الحلقات»', async () => {
  serve(courseView({ blocked: 'course_exists', current: bookedCourse() }));
  mockParams.current = { phone: PHONE };
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByRole('button', { name: t.salesMoney.saveSubscription })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.booking.courseDays })).toBeNull();
});

test('no child in the link (or not hers): no «أيام الحلقات»', async () => {
  mockParams.current = { phone: PHONE, studentId: 'someone-else' };
  mockApi.onRead(() => familyOf(kid(), kid({ id: 'k2' })));
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByRole('button', { name: t.salesMoney.saveSubscription })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.booking.courseDays })).toBeNull();
});
