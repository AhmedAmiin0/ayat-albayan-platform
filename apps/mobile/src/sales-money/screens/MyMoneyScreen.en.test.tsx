import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { commissionPage, earnings, myCommission } from '../testing/fixtures';
import { MyMoneyScreen } from './MyMoneyScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
const mockParams = jest.fn((): { view?: string } => ({}));
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useLocalSearchParams: () => mockParams() }));

test('an English run reads en.json: my wallet, its entries, then my terms, totals and statement status', async () => {
  expect(t).toEqual(en);
  mockApiFetch.mockImplementation((path: string) => {
    if (path.startsWith('/sales/me/commissions')) return Promise.resolve(commissionPage([myCommission({ state: 'voided', void_reason: 'payment_voided' })]));
    if (path.startsWith('/me/notifications')) return Promise.resolve({ items: [], total: 0, page: 1, pageSize: 20, unread: 0 });
    return Promise.resolve(earnings());
  });
  await renderWithQuery(<MyMoneyScreen />);
  expect(screen.getByRole('header', { name: en.assistantPortal.nav.earnings })).toBeTruthy();
  expect(await screen.findAllByText(new RegExp(en.assistantPortal.wallet.due))).toBeTruthy();
  expect(await screen.findByText(new RegExp(en.assistantPortal.wallet.voided.payment_voided))).toBeTruthy();
  expect(screen.getByText(en.assistantPortal.commission.voided)).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: en.assistantPortal.wallet.views.statements }));
  expect(await screen.findByText(en.assistantPortal.earnings.terms)).toBeTruthy();
  expect(screen.getAllByText(en.assistantPortal.earnings.totals.total).length).toBeGreaterThan(0);
  expect(screen.getByText(en.enums.payoutStatus.paid)).toBeTruthy();
  expect(screen.getByRole('tab', { name: en.assistantPortal.nav.payments })).toBeTruthy();
});
