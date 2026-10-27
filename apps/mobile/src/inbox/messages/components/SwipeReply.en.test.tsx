import { dragBy } from './swipe-reply.helpers';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

// English (LTR): the inline-end is the right, so every bubble answers a swipe right, as WhatsApp.
test('English: a swipe to the right (+dx) answers; to the left does nothing', async () => {
  expect(await dragBy(60)).toEqual({ claims: true, answered: true });
  expect(await dragBy(-60)).toEqual({ claims: false, answered: false });
});
