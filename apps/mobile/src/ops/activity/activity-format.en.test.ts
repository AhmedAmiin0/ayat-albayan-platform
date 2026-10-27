import { t } from '@/core/lib/i18n/i18n';
import { isolate } from '@/core/ui/primitives/Ltr';
import { actorLine } from './activity-format';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('English: an Arabic actor name is isolated before the English role', () => {
  expect(t.activity.roles.admin).toMatch(/[A-Za-z]/);
  expect(actorLine({ actor_name: 'منى', actor_role: 'admin' })).toBe(`${isolate('منى')} · ${t.activity.roles.admin}`);
  expect(actorLine({ actor_name: null, actor_role: 'admin' })).toBe(`${t.activity.unknownUser} · ${t.activity.roles.admin}`);
});
