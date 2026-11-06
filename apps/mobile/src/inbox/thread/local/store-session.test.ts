import { memoryPort } from '@/test/node-sql';
import { answer, A, id, row, threadRow } from '@/inbox/thread/store/store-fixtures';
import {
  nudgeInboxStore,
  putInboxReads,
  startInboxStore,
  stopInboxStore,
  storeReader,
} from './store-session';

// The app's one store session (docs/43 43-7): started per user, wiped on sign-out.

const mockFetch = jest.fn();
const mockDelete = jest.fn();
let mockPort = memoryPort().port;
jest.mock('@/inbox/thread/store/expo-port', () => ({
  openExpoPort: async () => mockPort,
  deleteStoreFile: async () => mockDelete(),
}));
jest.mock('@/inbox/thread/store/sync-fetch', () => ({
  fetchSyncPage: (since: string | undefined) => mockFetch(since),
}));

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(async () => {
  await stopInboxStore();
  mockPort = memoryPort().port;
  mockFetch.mockReset().mockResolvedValue(
    answer({ messages: [row({ n: 1 })], threads: [threadRow(A, 1)] }),
  );
  mockDelete.mockReset();
});

test('started: it syncs at once and the screens read the rows', async () => {
  await startInboxStore('user-a');
  const release = storeReader.watchChat(A);
  await settle();
  expect(mockFetch).toHaveBeenCalledWith(undefined);
  expect(storeReader.chat(A).map((m) => m.id)).toEqual([id(1)]);
  expect(storeReader.threads().has(A)).toBe(true);
  release();
});

test('the same user again keeps the session; a nudge syncs (throttled)', async () => {
  await startInboxStore('user-a');
  await settle();
  await startInboxStore('user-a');
  expect(mockFetch).toHaveBeenCalledTimes(1);
  nudgeInboxStore();
  await new Promise((resolve) => setTimeout(resolve, 1_100)); // the throttle's trailing run
  expect(mockFetch).toHaveBeenCalledTimes(2);
});

test('sign-out: the rows are wiped and the screens read nothing; no session deletes the file', async () => {
  jest.spyOn(mockPort, 'close').mockResolvedValue(); // the next sign-in opens the same file again
  await startInboxStore('user-a');
  await settle();
  await stopInboxStore();
  expect(storeReader.threads().size).toBe(0);
  await startInboxStore('user-b');
  mockFetch.mockReturnValue(new Promise(() => undefined)); // user-b's sync never answers
  const release = storeReader.watchChat(A);
  await settle();
  expect([storeReader.chat(A), storeReader.threads().size]).toEqual([[], 0]);
  release();
  await stopInboxStore();
  await stopInboxStore();
  expect(mockDelete).toHaveBeenCalledTimes(1);
});

test('without a session a nudge does nothing', () => {
  expect(() => nudgeInboxStore()).not.toThrow();
});

test('a chat read goes into the store (queued rows wait for the sync); none without a session', async () => {
  putInboxReads([row({ n: 8 })]);
  mockFetch.mockReturnValue(new Promise(() => undefined));
  await startInboxStore('user-a');
  const release = storeReader.watchChat(A);
  putInboxReads([row({ n: 2 }), row({ n: 3, status: 'queued' })]);
  await settle();
  expect(storeReader.chat(A).map((m) => m.id)).toEqual([id(2)]);
  release();
});

test('stop closes the connection', async () => {
  const close = jest.spyOn(mockPort, 'close');
  await startInboxStore('user-a');
  await stopInboxStore();
  expect(close).toHaveBeenCalledTimes(1);
});
