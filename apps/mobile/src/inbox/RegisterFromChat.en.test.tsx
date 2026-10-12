import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { RegisterFromChat } from './RegisterFromChat';
import { thread } from './thread-fixtures';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('an English run reads en.json: «Register a new student»', async () => {
  expect(t).toEqual(en);
  await render(<RegisterFromChat thread={thread} />);
  expect(screen.getByRole('button', { name: 'Register a new student' })).toBeTruthy();
});
