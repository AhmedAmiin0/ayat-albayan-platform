import { render, screen } from '@testing-library/react-native';
import { fakeNow } from '@/test/fake-now';
import { lesson } from '@/today/fixtures';
import { LiveSessions } from './LiveSessions';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

afterEach(() => jest.useRealTimers());

test('the live section reads in English', async () => {
  fakeNow(new Date('2026-10-01T13:10:00Z'));
  const next = lesson({ id: 'n', starts_at: '2026-10-01T13:20:00.000Z', ends_at: '2026-10-01T14:05:00.000Z' });
  await render(<LiveSessions lessons={[lesson({ id: 'r' }), next]} showTeacher />);
  expect(screen.getByText('Live sessions')).toBeTruthy();
  expect(screen.getByText('Live now')).toBeTruthy();
  expect(screen.getByText('Starts at 16:20')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Join the lesson' })).toHaveLength(2);
});
