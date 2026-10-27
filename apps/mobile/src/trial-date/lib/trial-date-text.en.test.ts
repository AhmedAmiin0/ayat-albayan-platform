import { lessonWhenText } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { isolate } from '@/core/ui/primitives/Ltr';
import { trialRow } from '../testing/fixtures';
import { pickedLine } from './trial-date-text';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('English: the Arabic name of who picked the date is isolated', () => {
  const when = lessonWhenText(new Date('2026-09-28T09:00:00.000Z'), 'Asia/Riyadh', 'en');
  expect(t.trialDate.pickedAt).toMatch(/[A-Za-z]/);
  expect(pickedLine(trialRow(), '24')).toBe(t.trialDate.pickedAt.replace('{name}', isolate('فاطمة')).replace('{when}', when));
  expect(pickedLine(trialRow({ picked_by: null }), '24')).toContain(t.trialDate.unknownPicker);
});
