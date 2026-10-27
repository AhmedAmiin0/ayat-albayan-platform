import ar from '@ab/shared/i18n/ar.json';
import { resendText } from './resend-side.helpers';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

// English UI (LTR): what goes to the family stays Arabic, so it reads on the right.
test('English: the same Arabic text, aligned right', async () => {
  expect(await resendText()).toEqual({ align: 'right', text: ar.inbox.resend.text });
});
