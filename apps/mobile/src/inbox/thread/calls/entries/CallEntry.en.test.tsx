import { callSides } from './call-entry.helpers';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

// English (LTR): the same logical sides, so ours lands on the right and the family's on the left.
test('English: ours at the inline-end (the right), theirs at the start (the left)', async () => {
  expect(await callSides()).toEqual({ ours: 'flex-end', theirs: 'flex-start' });
});
