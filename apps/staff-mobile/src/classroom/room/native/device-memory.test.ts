import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceMemory } from './device-memory';

beforeEach(() => AsyncStorage.clear());

test('no choice yet, then the saved one', async () => {
  await expect(deviceMemory.load()).resolves.toBeNull();
  await deviceMemory.save({ mic: true, cam: false });
  await expect(deviceMemory.load()).resolves.toEqual({ mic: true, cam: false });
});

test('a damaged or unreadable copy reads as no choice', async () => {
  await AsyncStorage.setItem('ab.room.devices', '{"mic":1');
  await expect(deviceMemory.load()).resolves.toBeNull();
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('io'));
  await expect(deviceMemory.load()).resolves.toBeNull();
});
