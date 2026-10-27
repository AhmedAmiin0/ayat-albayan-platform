import { quoteSides } from './content-side.helpers';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

// English UI (LTR), as WhatsApp: an Arabic quote on the right, an English one on the left.
test('English: an Arabic quote on the right, an English one at the start (the left)', async () => {
  expect(await quoteSides('السلام عليكم')).toEqual({ block: 'right', strip: 'right' });
  expect(await quoteSides('See you at five')).toEqual({ block: 'left', strip: 'left' });
});
