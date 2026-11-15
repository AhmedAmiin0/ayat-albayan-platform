import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from '@/inbox/thread/store/message-store';
import { readState } from '@/inbox/thread/store/store-read';
import { answer, row, threadRow, A } from '@/inbox/thread/store/store-fixtures';
import { startInboxStore, stopInboxStore, storeReader, wakeInboxStore } from './store-session';

// A push wake (docs/43 §5): the signed-in owner's store only; the app's session is joined.

const mockFetch = jest.fn();
const mockClose = jest.fn();
let mockFile = memoryPort();
// One file on disk: every open is a connection to it; closing one keeps the file.
jest.mock('@/inbox/thread/store/expo-port', () => ({
  openExpoPort: async () => ({ ...mockFile.port, close: async () => mockClose() }),
  deleteStoreFile: async () => undefined,
}));
jest.mock('@/inbox/thread/store/sync-fetch', () => ({
  fetchSyncPage: (since: string | undefined, signal: AbortSignal) => mockFetch(since, signal),
}));

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

/** The file as the app left it: `owner`'s store with one row. */
async function fileOf(owner: string): Promise<void> {
  const store = createMessageStore(mockFile.port);
  await store.open(owner);
  await store.putReads([row({ n: 1 })], owner);
}
const owner = async () => (await readState(mockFile.port)).owner;
const rows = () => mockFile.db.prepare('select count(*) as n from messages').all();

beforeEach(async () => {
  await stopInboxStore();
  mockFile = memoryPort();
  mockClose.mockReset();
  mockFetch.mockReset().mockResolvedValue(answer({ threads: [threadRow(A, 1)] }));
});

test('killed app, the owner signed in: one sync, then the wake closes its session (rows kept)', async () => {
  await fileOf('user-a');
  const wake = await wakeInboxStore('user-a');
  await wake?.sync();
  expect(mockFetch).toHaveBeenCalledTimes(1);
  await wake?.release();
  expect(storeReader.threads().size).toBe(0); // the reader let go
  expect([await owner(), rows()]).toEqual(['user-a', [{ n: 1 }]]);
});

test('the file holds another account, or nobody: nothing opened, synced or wiped', async () => {
  await fileOf('user-b');
  expect(await wakeInboxStore('user-a')).toBeNull();
  expect([await owner(), rows()]).toEqual(['user-b', [{ n: 1 }]]);
  mockFile = memoryPort(); // signed out earlier: the file was deleted
  expect(await wakeInboxStore('user-a')).toBeNull();
  expect(mockFetch).not.toHaveBeenCalled();
});

test('the app runs (foreground): the wake joins its run in flight and asks for one more', async () => {
  const answers: (() => void)[] = [];
  const asked = () => new Promise((resolve) => answers.push(() => resolve(answer())));
  mockFetch.mockImplementation(asked);
  await startInboxStore('user-a');
  const wake = await wakeInboxStore('user-a');
  const synced = wake?.sync();
  await settle();
  expect(mockFetch).toHaveBeenCalledTimes(1);
  answers[0]?.();
  await synced;
  await settle();
  answers[1]?.();
  await settle();
  expect(mockFetch).toHaveBeenCalledTimes(2); // the push's own run, never a third
  await wake?.release(); // the app's session stays
  mockClose.mockClear();
  await stopInboxStore();
  expect(mockClose).toHaveBeenCalledTimes(1);
});

test('two pushes on a killed app: the first out never stops the second one’s sync', async () => {
  await fileOf('user-a');
  const first = await wakeInboxStore('user-a');
  const second = await wakeInboxStore('user-a');
  await first?.sync();
  await first?.release();
  expect(mockClose).toHaveBeenCalledTimes(1); // only storedOwner's peek
  await second?.sync();
  expect(mockFetch).toHaveBeenCalledTimes(2);
  await second?.release();
  expect(mockClose).toHaveBeenCalledTimes(2);
  expect(storeReader.threads().size).toBe(0);
});

test('another account signed in on the running app: null', async () => {
  mockFetch.mockReturnValue(new Promise(() => undefined));
  await startInboxStore('user-b');
  expect(await wakeInboxStore('user-a')).toBeNull();
});

test('the app starts while a wake holds the store: the session becomes the app’s', async () => {
  await fileOf('user-a');
  const wake = await wakeInboxStore('user-a');
  await startInboxStore('user-a');
  await wake?.sync();
  await wake?.release();
  await settle();
  expect(storeReader.threads().has(A)).toBe(true);
});

test('released on time-out: the wake’s request is aborted', async () => {
  await fileOf('user-a');
  mockFetch.mockReturnValue(new Promise(() => undefined));
  const wake = await wakeInboxStore('user-a');
  void wake?.sync();
  await settle();
  await wake?.release();
  const signal: unknown = mockFetch.mock.calls[0]?.[1];
  expect(signal instanceof AbortSignal && signal.aborted).toBe(true);
});
