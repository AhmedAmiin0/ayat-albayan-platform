// docs/42 42-7: a lane's rows, at most `size` at a time, never two of one phone at once and each
// phone's rows in their queue order. size 1 = the queue order exactly (today's drain).

/** What a row's step says: go on, or stop the lane (its token is broken / the gate closed). */
export type Step = 'next' | 'paused' | 'closed';

interface PoolInput<T> {
  items: readonly T[];
  size: number;
  phoneOf: (item: T) => string;
  step: (item: T) => Promise<Step>;
}

/** Why the lane stopped, the row that stopped it and the rows never started. */
export interface PoolStop<T> {
  why: Exclude<Step, 'next'>;
  item: T;
  rest: T[];
}

interface PoolState<T> {
  stop: { why: Exclude<Step, 'next'>; item: T } | null;
  /** A row's step threw: nothing more starts; phonePool rethrows once every row has ended. */
  failed: boolean;
  started: Set<T>;
  running: Set<Promise<void>>;
  /** Every launched row (the final wait). */
  all: Promise<void>[];
  last: Map<string, Promise<void>>;
}

const halted = <T>(state: PoolState<T>): boolean => state.stop !== null || state.failed;

async function start<T>(input: PoolInput<T>, state: PoolState<T>, item: T): Promise<void> {
  if (halted(state)) return;
  state.started.add(item);
  const why = await input.step(item);
  if (why !== 'next') state.stop ??= { why, item };
}

/** Starts `item` after its phone's previous row; tracked until it ends. */
function launch<T>(input: PoolInput<T>, state: PoolState<T>, item: T): void {
  const phone = input.phoneOf(item);
  const task = (state.last.get(phone) ?? Promise.resolve()).then(() => start(input, state, item));
  state.last.set(phone, task);
  state.running.add(task);
  state.all.push(task);
  const ended = (ok: boolean): void => {
    state.failed ||= !ok;
    state.running.delete(task);
  };
  void task.then(() => ended(true), () => ended(false));
}

/**
 * Waits for every task, then rethrows the first rejection: a failed row never lets the caller (and
 * its lane lock) go while sibling rows are still in flight.
 */
export async function allEnded(tasks: Iterable<Promise<unknown>>): Promise<void> {
  const failed = (await Promise.allSettled(tasks)).find((r) => r.status === 'rejected');
  if (failed) throw failed.reason;
}

/** A slot frees when any task ends, failed or not (a failure is rethrown by the final wait). */
const anyEnded = (tasks: Set<Promise<void>>): Promise<unknown> =>
  Promise.race([...tasks].map((t) => t.then(settledOk, settledOk)));
const settledOk = (): void => undefined;

async function freeSlot<T>(input: PoolInput<T>, state: PoolState<T>): Promise<void> {
  while (state.running.size >= input.size && !halted(state)) await anyEnded(state.running);
}

/** Runs the lane; null = every row ran. */
export async function phonePool<T>(input: PoolInput<T>): Promise<PoolStop<T> | null> {
  const state: PoolState<T> = {
    stop: null, failed: false, started: new Set(), running: new Set(), all: [], last: new Map(),
  };
  for (const item of input.items) {
    await freeSlot(input, state);
    if (halted(state)) break;
    launch(input, state, item);
  }
  await allEnded(state.all);
  const { stop } = state;
  return stop && { ...stop, rest: input.items.filter((i) => !state.started.has(i)) };
}
