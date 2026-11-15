import { buildId, CLIENT_HEADER, mobileClientTag } from './client-tag';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '0.2.0' } } }));
jest.mock('expo-updates', () => ({ updateId: '0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b' }));

test('the store build: just the app version', () => {
  expect(buildId({ version: '0.2.0', updateId: null })).toBe('0.2.0');
});

test('after an OTA update: version + the first 12 characters of the update id (dashes dropped)', () => {
  expect(buildId({ version: '0.2.0', updateId: '0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b' })).toBe(
    '0.2.0+0193a1b2c3d4',
  );
});

test('no usable version reads as dev (expo go, tests, odd values)', () => {
  expect(buildId({})).toBe('dev');
  expect(buildId({ version: null, updateId: undefined })).toBe('dev');
  expect(buildId({ version: '0.2 beta' })).toBe('dev');
  expect(buildId({ version: 'a'.repeat(41) })).toBe('dev');
  expect(buildId({ updateId: 'abc' })).toBe('dev+abc');
});

test('the header carries mobile/<build> from expo-constants and expo-updates', () => {
  expect(CLIENT_HEADER).toBe('X-AB-Client');
  expect(mobileClientTag()).toBe('mobile/0.2.0+0193a1b2c3d4');
  expect(mobileClientTag()).toBe('mobile/0.2.0+0193a1b2c3d4');
});
