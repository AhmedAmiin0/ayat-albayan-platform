import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { partPaidLine } from '@/payments';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { details } from '@/sales/sales/student/fixtures';
import { SalesStudentScreen } from '@/sales/sales/student/SalesStudentScreen/SalesStudentScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'st1' }),
}));
jest.mock('@ab/mobile-kit/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

const s = t.sales.student;
const h = t.sales.history;
const part = { paid: 100, price: 290, due: 190, currency: 'SAR' };
const base = details();
const [current, past] = base.subscriptions;
const subs = [...(current ? [{ ...current, part_paid: part }] : []), ...(past ? [past] : [])];
const other = () => details({ mine: false, subscriptions: subs });
beforeEach(() => {
  mockApi.reset('read');
  fakeNow(new Date('2026-10-27T10:00:00Z'));
});
afterEach(() => jest.useRealTimers());

// Every assistant sees every student.
test("another assistant's student: status, subscription with what is paid, lessons used / left, reports; no note", async () => {
  mockApi.onRead(() => other());
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(s.current)).toBeTruthy();
  expect(screen.getByText(t.enums.studentStatus.active)).toBeTruthy();
  expect(
    screen.getByText(`${t.enums.packageSize['8']} · ${t.enums.subscriptionStatus.active}`),
  ).toBeTruthy();
  expect(
    screen.getByText(
      `${h.used.replace('{used}', '3').replace('{total}', '8')} · ${h.remaining.replace('{n}', '5')}`,
    ),
  ).toBeTruthy();
  expect(screen.getByText(partPaidLine(part) ?? 'missing')).toBeTruthy();
  expect(screen.getByText(s.reports)).toBeTruthy();
  expect(screen.queryByText(t.reports.noReports)).toBeNull();
  expect(screen.queryByText(/ليس من طلابك/)).toBeNull();
});

test('not hers and not listed by the family view (no sales.renew_any): no money action', async () => {
  mockApi.onRead(async ({ path }) =>
    path.startsWith('/sales/money/family') ? { students: [] } : other(),
  );
  await renderWithQuery(<SalesStudentScreen />);
  await screen.findByText(s.current);
  expect(screen.queryByText(t.sales.money.renew)).toBeNull();
  expect(screen.queryByText(t.sales.money.transfer)).toBeNull();
});
