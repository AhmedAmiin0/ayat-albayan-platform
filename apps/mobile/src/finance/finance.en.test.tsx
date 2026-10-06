import en from '@ab/shared/i18n/en.json';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { FinanceSection } from '@/more/FinanceSection';
import { renderWithQuery } from '@/test/query';
import { monthLabel } from '@/teacher/payout-text';
import { amountText } from './format';
import { APPROVED } from './fixtures';
import { PayoutsScreen } from './PayoutsScreen';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

test('an English run reads en.json: the «Payouts and expenses» section on More', async () => {
  expect(locale).toBe('en');
  expect(t.mobileFinance.section).toBe(en.mobileFinance.section); // t is a lookup over en.json, not the object itself
  await render(<FinanceSection />);
  expect(screen.getByRole('header', { name: en.mobileFinance.section })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.mobileFinance.rows.expenses })).toBeTruthy();
});

test('the statement detail, the due line and the month in English with Western digits', async () => {
  mockApiFetch.mockResolvedValue([APPROVED]);
  await renderWithQuery(<PayoutsScreen />);
  await fireEvent.press(await screen.findByText('سلمى'));
  expect(screen.getByText(en.enums.payoutStatus.approved)).toBeTruthy();
  expect(screen.getByRole('button', { name: en.finance.confirmPaid })).toBeTruthy();
  expect(screen.getByText(en.mobileFinance.payouts.due.replace('{amount}', amountText(1500)))).toBeTruthy();
  expect(amountText(1500)).toBe('⁦1,500⁩ EGP');
  expect(monthLabel('2026-09')).toBe('September 2026');
});
