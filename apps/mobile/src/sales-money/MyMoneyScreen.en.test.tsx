import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { earnings } from './fixtures';
import { MyMoneyScreen } from './MyMoneyScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

test('an English run reads en.json: my earnings, terms, totals and statement status', async () => {
  expect(t).toEqual(en);
  mockApiFetch.mockResolvedValue(earnings());
  await renderWithQuery(<MyMoneyScreen />);
  expect(screen.getByRole('header', { name: en.assistantPortal.nav.earnings })).toBeTruthy();
  expect(await screen.findByText(en.assistantPortal.earnings.terms)).toBeTruthy();
  expect(screen.getAllByText(en.assistantPortal.earnings.totals.total).length).toBeGreaterThan(0);
  expect(screen.getByText(en.enums.payoutStatus.paid)).toBeTruthy();
  expect(screen.getByRole('tab', { name: en.assistantPortal.nav.payments })).toBeTruthy();
});
