import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '@ab/client-core';
import {
  dropIfRefused,
  dropStoredDraft,
  keepStoredDraft,
  readStoredDraft,
  REPORT_DRAFTS_KEY,
} from './draft-storage';

const kept = (body: string) => ({ body, base: '{}' });
const bodyOf = async (id: string) => (await readStoredDraft(id))?.body ?? null;

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('keeps one unsent body per report id under one key', async () => {
  await keepStoredDraft('r-1', kept('{"notes":"أ"}'));
  await keepStoredDraft('r-2', kept('{"notes":"ب"}'));
  expect(await bodyOf('r-1')).toBe('{"notes":"أ"}');
  expect(await bodyOf('r-2')).toBe('{"notes":"ب"}');
  expect(Object.keys(JSON.parse((await AsyncStorage.getItem(REPORT_DRAFTS_KEY)) ?? '{}'))).toEqual([
    'r-1',
    'r-2',
  ]);
});

test('a drop forgets only that report', async () => {
  await keepStoredDraft('r-1', kept('a'));
  await keepStoredDraft('r-2', kept('b'));
  await dropStoredDraft('r-1');
  expect(await readStoredDraft('r-1')).toBeNull();
  expect(await bodyOf('r-2')).toBe('b');
});

test('writes run in call order', async () => {
  const keep = keepStoredDraft('r-1', kept('a'));
  const drop = dropStoredDraft('r-1');
  const again = keepStoredDraft('r-1', kept('b'));
  await Promise.all([keep, drop, again]);
  expect(await bodyOf('r-1')).toBe('b');
});

test('a stored value of the wrong shape reads as nothing', async () => {
  await AsyncStorage.setItem(REPORT_DRAFTS_KEY, '{"r-1": 5}');
  expect(await readStoredDraft('r-1')).toBeNull();
  await AsyncStorage.setItem(REPORT_DRAFTS_KEY, 'not json');
  expect(await readStoredDraft('r-1')).toBeNull();
});

test('unreadable or full storage never throws', async () => {
  const io = new Error('io');
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(io).mockRejectedValueOnce(io);
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(io);
  await expect(readStoredDraft('r-1')).resolves.toBeNull();
  await expect(keepStoredDraft('r-1', kept('a'))).resolves.toBeUndefined();
  await expect(dropStoredDraft('r-1')).resolves.toBeUndefined();
});

test("a failed read never overwrites the other reports' drafts", async () => {
  await keepStoredDraft('r-1', kept('a'));
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('io'));
  await keepStoredDraft('r-2', kept('b'));
  expect(await bodyOf('r-1')).toBe('a');
});

test('one malformed entry does not cost the valid ones', async () => {
  await AsyncStorage.setItem(REPORT_DRAFTS_KEY, '{"r-1": 5, "r-2": {"body": "b", "base": "{}"}}');
  expect(await bodyOf('r-2')).toBe('b');
  await keepStoredDraft('r-3', kept('c'));
  expect(await bodyOf('r-2')).toBe('b');
  expect(await readStoredDraft('r-1')).toBeNull();
});

test('a save the server refused drops its copy; a network failure or a 5xx keeps it', async () => {
  await keepStoredDraft('r-1', kept('a'));
  await dropIfRefused('r-1', new TypeError('Network request failed'));
  await dropIfRefused('r-1', new ApiError(503));
  expect(await bodyOf('r-1')).toBe('a');
  await dropIfRefused('r-1', new ApiError(403));
  expect(await readStoredDraft('r-1')).toBeNull();
});
