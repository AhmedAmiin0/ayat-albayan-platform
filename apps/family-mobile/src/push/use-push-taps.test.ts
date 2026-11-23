import { renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { usePushTaps } from './use-push-taps';

const mockOpen = jest.fn();
jest.mock('#/nav/index.ts', () => ({ openAlert: (target: unknown) => mockOpen(target) }));
jest.mock('expo-notifications', () => ({
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const S = '11111111-1111-4111-8111-111111111111';
const L = '22222222-2222-4222-8222-222222222222';
const tap = (data: unknown) => ({ notification: { request: { content: { data } } } });
const mocked = jest.mocked(Notifications);

beforeEach(() => jest.clearAllMocks());

test('the «بدأت الحلقة» tap that started the app opens that lesson, once', async () => {
  mocked.getLastNotificationResponse.mockReturnValueOnce(
    tap({ kind: 'lesson_live', studentId: S, lessonId: L }) as never,
  );
  await renderHook(() => usePushTaps());
  expect(mockOpen).toHaveBeenCalledWith({ screen: 'live', studentId: S, lessonId: L });
  expect(mocked.clearLastNotificationResponse).toHaveBeenCalled();
});

test('a tap while running opens its target; an unknown push opens nothing', async () => {
  await renderHook(() => usePushTaps());
  const listener = mocked.addNotificationResponseReceivedListener.mock.calls[0]?.[0];
  listener?.(tap({ kind: 'lesson_starting', studentId: S }) as never);
  expect(mockOpen).toHaveBeenLastCalledWith({ screen: 'child', studentId: S });
  listener?.(tap({ kind: 'nope' }) as never);
  expect(mockOpen).toHaveBeenCalledTimes(1);
});
