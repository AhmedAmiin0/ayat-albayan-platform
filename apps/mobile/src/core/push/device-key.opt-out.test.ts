import AsyncStorage from '@react-native-async-storage/async-storage';
import { PUSH_OPT_OUT_KEY, pushOptedOut, setPushOptOut } from './device-key';

beforeEach(() => AsyncStorage.clear());

test('on by default; off is remembered; on again clears it', async () => {
  expect(await pushOptedOut()).toBe(false);
  await setPushOptOut(true);
  expect(await AsyncStorage.getItem(PUSH_OPT_OUT_KEY)).toBe('1');
  expect(await pushOptedOut()).toBe(true);
  await setPushOptOut(false);
  expect(await pushOptedOut()).toBe(false);
});

test('unreadable storage counts as «on»', async () => {
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
  expect(await pushOptedOut()).toBe(false);
});
