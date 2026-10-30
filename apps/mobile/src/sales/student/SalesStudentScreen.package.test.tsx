import type { SalesPackageSummary } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
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
const summary: SalesPackageSummary = {
  id: 'sub9', package: '12', status: 'paused', starts_on: '2026-10-01', renews_on: null, ended_at: null,
  projected_end_at: '2026-11-20T08:00:00.000Z', created_at: '2026-09-30T10:00:00.000Z',
  lessons_total: 12, lessons_used: 5, lessons_remaining: 7,
};
const other = (pkg: SalesPackageSummary | null) =>
  details({ mine: false, subscriptions: [], current_id: null, reports: { items: [], total: 0 }, package: pkg });
beforeEach(() => {
  mockApiFetch.mockReset();
  fakeNow(new Date('2026-10-27T10:00:00Z'));
});
afterEach(() => jest.useRealTimers());

// Owner 2026-10-30: «Why i cant see the subscription lessoons and ststus of this user».
test('another assistant\'s student: the status chip and the current package, used / left and the expected end', async () => {
  mockApiFetch.mockResolvedValue(other(summary));
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(s.notMine)).toBeTruthy();
  expect(s.notMine).toBe('ليس من طلابك: تظهر الحالة والباقة والجدول والحضور، أما المبالغ والتقارير فلطلابك فقط');
  expect(screen.getByText(t.enums.studentStatus.active)).toBeTruthy();
  expect(screen.getByText(s.subscription)).toBeTruthy();
  expect(screen.getByText(`${t.enums.packageSize['12']} · ${t.enums.subscriptionStatus.paused}`)).toBeTruthy();
  expect(screen.getByText(`${h.used.replace('{used}', '5').replace('{total}', '12')} · ${h.remaining.replace('{n}', '7')}`)).toBeTruthy();
  expect(screen.getByText(h.starts.replace('{date}', ltr('2026-10-01')))).toBeTruthy();
  expect(screen.getByText(h.projectedEnd.replace('{date}', ltr('2026-11-20')))).toBeTruthy();
  expect(screen.queryByText(t.reports.noReports)).toBeNull();
  expect(screen.queryByText(/ر\.س|SAR|290/)).toBeNull();
});

test('another\'s student without a package: «لا يوجد اشتراك بعد»; an old cache without the field: no section', async () => {
  mockApiFetch.mockResolvedValue(other(null));
  const view = await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(s.noSubscription)).toBeTruthy();
  await view.unmount();
  const old: Record<string, unknown> = { ...other(null) };
  delete old.package;
  mockApiFetch.mockResolvedValue(old);
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(s.notMine)).toBeTruthy();
  expect(screen.queryByText(s.subscription)).toBeNull();
});

test('one of hers: her subscriptions as before (not the summary card), and the status chip', async () => {
  mockApiFetch.mockResolvedValue(details({ package: summary }));
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(s.current)).toBeTruthy();
  expect(screen.getByText(`${t.enums.packageSize['8']} · ${t.enums.subscriptionStatus.active}`)).toBeTruthy();
  expect(screen.queryByText(`${t.enums.packageSize['12']} · ${t.enums.subscriptionStatus.paused}`)).toBeNull();
  expect(screen.getByText(t.enums.studentStatus.active)).toBeTruthy();
  expect(screen.queryByText(s.notMine)).toBeNull();
});
