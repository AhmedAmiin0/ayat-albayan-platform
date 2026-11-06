import { memoryPort } from '@/test/node-sql';
import { createMessageStore } from './message-store';
import { A, answer, row } from './store-fixtures';
import { createSyncEngine, SYNC_FALLBACK_MS, SYNC_THROTTLE_MS } from './sync-engine';

// When the loop runs: nudges throttled, a fallback while started, nothing after stop().

function setup(owner = 'user-a') {
  const store = createMessageStore(memoryPort().port);
  let release: () => void = () => undefined;
  const gate = () => new Promise<void>((resolve) => (release = resolve));
  let asked = 0;
  const fetchPage = jest.fn(async (_since: string | undefined, signal: AbortSignal) => {
    asked += 1;
    await gate();
    if (signal.aborted) throw new Error('aborted');
    return answer({ messages: [row({ n: asked })] });
  });
  const engine = createSyncEngine({ store, owner, fetchPage });
  const answerNow = async () => {
    await jest.advanceTimersByTimeAsync(0);
    release();
    await jest.advanceTimersByTimeAsync(0);
  };
  return { store, engine, fetchPage, answerNow };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('a burst of nudges: one run now, one more at the end of the window', async () => {
  const t = setup();
  for (let i = 0; i < 10; i += 1) t.engine.nudge();
  await t.answerNow();
  await jest.advanceTimersByTimeAsync(SYNC_THROTTLE_MS);
  await t.answerNow();
  await jest.advanceTimersByTimeAsync(SYNC_THROTTLE_MS * 5);
  expect(t.fetchPage).toHaveBeenCalledTimes(2);
});

test('a run asked for during a run follows it once (never two at a time)', async () => {
  const t = setup();
  const first = t.engine.syncNow();
  await jest.advanceTimersByTimeAsync(0);
  void t.engine.syncNow();
  void t.engine.syncNow();
  expect(t.fetchPage).toHaveBeenCalledTimes(1);
  await t.answerNow();
  await first;
  await t.answerNow();
  expect(t.fetchPage).toHaveBeenCalledTimes(2);
});

test('started: a sync at once and every SYNC_FALLBACK_MS; stop() ends it', async () => {
  const t = setup();
  t.engine.start();
  await t.answerNow();
  await jest.advanceTimersByTimeAsync(SYNC_FALLBACK_MS);
  await t.answerNow();
  expect(t.fetchPage).toHaveBeenCalledTimes(2);
  t.engine.stop();
  await jest.advanceTimersByTimeAsync(SYNC_FALLBACK_MS * 3);
  expect(t.fetchPage).toHaveBeenCalledTimes(2);
});

test('stop() while a page is out: the request is aborted, nothing is written', async () => {
  const t = setup();
  const run = t.engine.syncNow();
  await jest.advanceTimersByTimeAsync(0);
  t.engine.stop();
  expect(t.fetchPage.mock.calls[0]?.[1].aborted).toBe(true);
  await t.answerNow();
  await run;
  expect(await t.store.chat(A, 10)).toEqual([]);
});

test('an answer that lands after the account switched is dropped by the store', async () => {
  const t = setup('user-a');
  const run = t.engine.syncNow();
  await jest.advanceTimersByTimeAsync(0);
  await t.store.wipe();
  await t.store.open('user-b');
  await t.answerNow();
  await run;
  expect(await t.store.chat(A, 10)).toEqual([]);
});
