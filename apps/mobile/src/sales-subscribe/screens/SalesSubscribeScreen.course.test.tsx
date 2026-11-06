import type { SalesCourseView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { bookedCourse, courseView } from '@/sales-course/testing/fixtures';
import { renderWithQuery } from '@/test/query';
import { familyOf, KID, kid, PHONE } from '@/sales-subscribe/testing/fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

// «أيام الحلقات» on the chat's «اشتراك جديد» (owner 2026-11-06): for the resolved child (picked,
// preselected or the only one) while GET /sales/booking/course lets her book its package.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: () => Promise.resolve(jest.requireActual('@/sales-subscribe/testing/fixtures').salesQuote),
}));
const mockPush = jest.fn();
const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: (h: unknown) => mockPush(h) },
  useLocalSearchParams: () => mockParams.current,
}));

const serve = (course: SalesCourseView) =>
  mockApiFetch.mockImplementation(async (path: string) =>
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
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/inbox/sales-course', params: { studentId: KID } });
});

test('the only child, from the chat strip (no studentId): «أيام الحلقات» too', async () => {
  mockParams.current = { phone: PHONE };
  await renderWithQuery(<SalesSubscribeScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.booking.courseDays }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/inbox/sales-course', params: { studentId: KID } });
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
  mockApiFetch.mockResolvedValue(familyOf(kid(), kid({ id: 'k2' })));
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByRole('button', { name: t.salesMoney.saveSubscription })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.booking.courseDays })).toBeNull();
});
