import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { isolate } from '@/core/ui/primitives/Ltr';
import { renderWithQuery } from '@/test/query';
import { myPayment } from '../testing/fixtures';
import { MyPaymentItem } from './MyPaymentItem';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('English: the Arabic note is isolated inside the «note:» line', async () => {
  await renderWithQuery(<MyPaymentItem payment={myPayment({ method: 'cash' })} />);
  expect(screen.getByText(`${t.assistantPortal.payments.note}: ${isolate('دفعة أولى')}`)).toBeTruthy();
});

test('English: no note, no line', async () => {
  await renderWithQuery(<MyPaymentItem payment={myPayment({ method: 'cash', note: null })} />);
  expect(screen.queryByText(new RegExp(`^${t.assistantPortal.payments.note}:`))).toBeNull();
});
