import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { isolate } from '@/core/ui/primitives/Ltr';
import { PAID } from '../shared/fixtures';
import { PayoutFacts } from './PayoutFacts';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('English: the Arabic payout note is isolated inside the English sentence', async () => {
  await render(<PayoutFacts payout={PAID} />);
  expect(t.mobileFinance.payouts.note).toMatch(/[A-Za-z]/);
  expect(screen.getByText(t.mobileFinance.payouts.note.replace('{note}', isolate('دفعة أكتوبر')))).toBeTruthy();
});
