import { QueryClient } from '@tanstack/react-query';
import { changeLists, missedChange, rereadList, showList } from './list-marks';

// docs/43 43-1 / AU1 / AU2 (review of PR #669): a hidden list keeps a time mark that no late
// answer can clear; a shown list joins its read in flight, then reads once more (no stale last
// word, no starvation under a stream of events).

const KEY = ['threads', 'list', { search: '', unread: false }];

/** A list whose reads answer only when the test says so; `signals` tells which were aborted. */
function slowList() {
  const queries = { retry: false, gcTime: Infinity };
  const client = new QueryClient({ defaultOptions: { queries } });
  const answers: ((v: string) => void)[] = [];
  const signals: AbortSignal[] = [];
  const queryFn = ({ signal }: { signal: AbortSignal }) => {
    signals.push(signal);
    return new Promise<string>((resolve) => answers.push(resolve));
  };
  client.setQueryDefaults(KEY, { queryFn });
  client.setQueryData(KEY, 'old', { updatedAt: 1 });
  const answer = async (i: number, v: string) => {
    answers[i]?.(v);
    await new Promise((r) => setTimeout(r, 0));
  };
  return { client, answers, signals, answer, data: () => client.getQueryData(KEY) };
}

test('hidden: the read in flight is cancelled, so its older answer never lands nor clears the mark', async () => {
  const { client, signals, answer, data } = slowList();
  void client.refetchQueries({ queryKey: KEY }); // the realtime read at t0
  changeLists(client); // an opened chat at t1: the list is under it
  expect(signals[0]?.aborted).toBe(true);
  await answer(0, 'stale from t0');
  expect(data()).toBe('old');
  expect(missedChange(client, KEY)).toBe(true); // back on screen it reads again
});

test('a read that ends after the mark clears it; a cache write keeping the time does not', async () => {
  const { client, answer } = slowList();
  changeLists(client);
  client.setQueryData(KEY, 'lifted', { updatedAt: 1 }); // liftTicks keeps the list's time
  expect(missedChange(client, KEY)).toBe(true);
  const read = rereadList(client, KEY);
  await answer(0, 'fresh');
  await read;
  expect(missedChange(client, KEY)).toBe(false);
});

test('shown: a read in flight is joined (never aborted), then one more read has the last word', async () => {
  const { client, signals, answer, data } = slowList();
  const release = showList(KEY);
  void client.refetchQueries({ queryKey: KEY }); // started before the change
  changeLists(client);
  expect(signals).toHaveLength(1);
  await answer(0, 'stale');
  expect(signals).toHaveLength(2); // the follow-up, started after the change
  await answer(1, 'fresh');
  expect(data()).toBe('fresh');
  expect(signals[0]?.aborted).toBe(false);
  release();
});

test('a change during a read rereadList itself started gets one follow-up (never lost)', async () => {
  const { client, signals, answer, data } = slowList();
  const release = showList(KEY);
  changeLists(client); // an idle list: this starts the read
  expect(signals).toHaveLength(1);
  changeLists(client); // the throttle's tail, a push: during that read
  changeLists(client);
  expect(signals).toHaveLength(1);
  await answer(0, 'old tick');
  expect(signals).toHaveLength(2);
  await answer(1, 'fresh');
  expect(data()).toBe('fresh');
  expect(signals.map((s) => s.aborted)).toEqual([false, false]);
  release();
});

test('no starvation: a stream of events during a slow read never cancels it; one follow-up only', async () => {
  const { client, signals, answer, data } = slowList();
  const release = showList(KEY);
  void client.refetchQueries({ queryKey: KEY });
  for (let i = 0; i < 5; i += 1) changeLists(client);
  await answer(0, 'page 1-3');
  expect(signals.map((s) => s.aborted)).toEqual([false, false]);
  await answer(1, 'fresh');
  expect(data()).toBe('fresh');
  release();
});

test('nothing in flight: one read; a list shown twice stays shown until both release', async () => {
  const { client, signals, answer } = slowList();
  const a = showList(KEY);
  const b = showList(KEY);
  a();
  changeLists(client);
  expect(signals).toHaveLength(1);
  await answer(0, 'fresh');
  b();
  changeLists(client);
  expect(signals).toHaveLength(1); // hidden now: marked, not read
});

test('with a page-1 read: an idle list reads page 1 only, a change meanwhile one more page 1', async () => {
  const { client, signals } = slowList();
  const heads: (() => void)[] = [];
  const head = () => new Promise<void>((resolve) => heads.push(() => resolve()));
  const release = showList(KEY, head);
  changeLists(client);
  changeLists(client); // during the page-1 read
  expect([heads.length, signals.length]).toEqual([1, 0]);
  heads[0]?.();
  await new Promise((r) => setTimeout(r, 0));
  expect([heads.length, signals.length]).toEqual([2, 0]); // never a full read
  release();
});

test('with a page-1 read: a full read in flight is joined, then page 1 (no second full read)', async () => {
  const { client, signals, answer } = slowList();
  const head = jest.fn(() => Promise.resolve());
  const release = showList(KEY, head);
  void client.refetchQueries({ queryKey: KEY }); // the safety poll, before the change
  changeLists(client);
  expect(head).not.toHaveBeenCalled();
  await answer(0, 'all pages');
  expect(head).toHaveBeenCalledTimes(1);
  expect(signals).toHaveLength(1);
  expect(signals[0]?.aborted).toBe(false);
  release();
});
