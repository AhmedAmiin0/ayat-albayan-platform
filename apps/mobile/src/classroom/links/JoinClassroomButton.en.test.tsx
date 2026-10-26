import { act, render, screen } from '@testing-library/react-native';
import { lesson } from '@/today/testing/fixtures';
import { JoinClassroomButton } from './JoinClassroomButton';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('the button and its hints read in English', async () => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
  jest.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
  await render(<JoinClassroomButton lesson={lesson({ id: 'l-1' })} />);
  expect(screen.getByRole('button', { name: 'Join the lesson' })).toBeTruthy();
  expect(screen.getByText(/15:45/)).toBeTruthy();
  await act(async () => jest.setSystemTime(new Date('2026-10-01T18:00:00.000Z')));
  jest.useRealTimers();
});
