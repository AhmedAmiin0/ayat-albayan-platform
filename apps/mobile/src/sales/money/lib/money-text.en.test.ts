import { t } from '@/core/lib/i18n/i18n';
import { isolate } from '@/core/ui/primitives/Ltr';
import { lineText } from './money-text';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

const p = t.assistantPortal.earnings;

test('English: an Arabic adjustment reason is isolated; none leaves no marks', () => {
  const line = { kind: 'adjustment' as const, amount: -1, currency: 'EGP', student: null, reason: 'تصحيح', commission_kind: null };
  expect(p.line.adjustment).toMatch(/[A-Za-z]/);
  expect(lineText(line)).toBe(p.line.adjustment.replace('{reason}', isolate('تصحيح')));
  expect(lineText({ ...line, reason: null })).toBe(p.line.adjustment.replace('{reason}', ''));
});
