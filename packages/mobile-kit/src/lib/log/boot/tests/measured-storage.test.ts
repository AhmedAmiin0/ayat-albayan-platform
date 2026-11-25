import AsyncStorage from '@react-native-async-storage/async-storage';
import { noteRestoredCache } from '../boot-mark';
import { measuredStorage } from '../measured-storage';

jest.mock('../boot-mark', () => ({ noteRestoredCache: jest.fn() }));

beforeEach(async () => {
  jest.mocked(noteRestoredCache).mockClear();
  await AsyncStorage.clear();
});

test('a read passes the stored value through and notes it', async () => {
  await AsyncStorage.setItem('ab-query-cache', '{"clientState":{}}');
  const value = await measuredStorage(AsyncStorage).getItem('ab-query-cache');
  expect(value).toBe('{"clientState":{}}');
  expect(noteRestoredCache).toHaveBeenCalledWith('{"clientState":{}}');
});

test('a missing value is noted as null', async () => {
  expect(await measuredStorage(AsyncStorage).getItem('ab-query-cache')).toBeNull();
  expect(noteRestoredCache).toHaveBeenCalledWith(null);
});

test('writes and removes reach the storage and note nothing', async () => {
  const storage = measuredStorage(AsyncStorage);
  await storage.setItem('k', 'v');
  expect(await AsyncStorage.getItem('k')).toBe('v');
  await storage.removeItem('k');
  expect(await AsyncStorage.getItem('k')).toBeNull();
  expect(noteRestoredCache).not.toHaveBeenCalled();
});
