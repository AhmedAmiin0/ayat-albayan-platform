import AsyncStorage from '@react-native-async-storage/async-storage';
import { dropStoredDraft, keepStoredDraft, readStoredDraft, REPORT_DRAFTS_KEY } from './draft-storage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('keeps one unsent body per report id under one key', async () => {
  await keepStoredDraft('r-1', '{"notes":"أ"}');
  await keepStoredDraft('r-2', '{"notes":"ب"}');
  expect(await readStoredDraft('r-1')).toBe('{"notes":"أ"}');
  expect(await readStoredDraft('r-2')).toBe('{"notes":"ب"}');
  expect(Object.keys(JSON.parse((await AsyncStorage.getItem(REPORT_DRAFTS_KEY)) ?? '{}'))).toEqual([
    'r-1',
    'r-2',
  ]);
});

test('a drop forgets only that report', async () => {
  await keepStoredDraft('r-1', 'a');
  await keepStoredDraft('r-2', 'b');
  await dropStoredDraft('r-1');
  expect(await readStoredDraft('r-1')).toBeNull();
  expect(await readStoredDraft('r-2')).toBe('b');
});

test('writes run in call order', async () => {
  const keep = keepStoredDraft('r-1', 'a');
  const drop = dropStoredDraft('r-1');
  const again = keepStoredDraft('r-1', 'b');
  await Promise.all([keep, drop, again]);
  expect(await readStoredDraft('r-1')).toBe('b');
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
  await expect(keepStoredDraft('r-1', 'a')).resolves.toBeUndefined();
  await expect(dropStoredDraft('r-1')).resolves.toBeUndefined();
});

test("a failed read never overwrites the other reports' drafts", async () => {
  await keepStoredDraft('r-1', 'a');
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('io'));
  await keepStoredDraft('r-2', 'b');
  expect(await readStoredDraft('r-1')).toBe('a');
});

test('one malformed entry does not cost the valid ones', async () => {
  await AsyncStorage.setItem(REPORT_DRAFTS_KEY, '{"r-1": 5, "r-2": "b"}');
  expect(await readStoredDraft('r-2')).toBe('b');
  await keepStoredDraft('r-3', 'c');
  expect(await readStoredDraft('r-2')).toBe('b');
  expect(await readStoredDraft('r-1')).toBeNull();
});
