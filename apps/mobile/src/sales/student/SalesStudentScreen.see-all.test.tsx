import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { partPaidLine } from '@/payments';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { details } from './fixtures';
import { SalesStudentScreen } from './SalesStudentScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 'st1' }) }));
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

const s = t.sales.student;
const h = t.sales.history;
const part = { paid: 100, price: 290, due: 190, currency: 'SAR' };
const base = details();
const [current, past] = base.subscriptions;
const subs = [...(current ? [{ ...current, part_paid: part }] : []), ...(past ? [past] : [])];
const other = () => details({ mine: false, subscriptions: subs });
beforeEach(() => {
  mockApiFetch.mockReset();
  fakeNow(new Date('2026-10-27T10:00:00Z'));
});
afterEach(() => jest.useRealTimers());

// Owner 2026-10-30: «Make all assistants see all».
test('another assistant\'s student: status, subscription with what is paid, lessons used / left, reports; no note', async () => {
  mockApiFetch.mockResolvedValue(other());
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(s.current)).toBeTruthy();
  expect(screen.getByText(t.enums.studentStatus.active)).toBeTruthy();
  expect(screen.getByText(`${t.enums.packageSize['8']} · ${t.enums.subscriptionStatus.active}`)).toBeTruthy();
  expect(screen.getByText(`${h.used.replace('{used}', '3').replace('{total}', '8')} · ${h.remaining.replace('{n}', '5')}`)).toBeTruthy();
  expect(screen.getByText(partPaidLine(part) ?? 'missing')).toBeTruthy();
  expect(screen.getByText(s.reports)).toBeTruthy();
  expect(screen.queryByText(t.reports.noReports)).toBeNull();
  expect(screen.queryByText(/ليس من طلابك/)).toBeNull();
});

test('the money action stays on her own students only (writes unchanged)', async () => {
  mockApiFetch.mockResolvedValue(other());
  await renderWithQuery(<SalesStudentScreen />);
  await screen.findByText(s.current);
  expect(screen.queryByText(t.sales.money.renew)).toBeNull();
  expect(screen.queryByText(t.sales.money.transfer)).toBeNull();
});
