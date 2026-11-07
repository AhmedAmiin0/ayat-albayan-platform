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
  started: Set<T>;
  running: Set<Promise<void>>;
  last: Map<string, Promise<void>>;
}

async function start<T>(input: PoolInput<T>, state: PoolState<T>, item: T): Promise<void> {
  if (state.stop) return;
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
  void task.finally(() => state.running.delete(task)).catch(() => undefined);
}

async function freeSlot<T>(input: PoolInput<T>, state: PoolState<T>): Promise<void> {
  while (state.running.size >= input.size) await Promise.race(state.running);
}

/** Runs the lane; null = every row ran. */
export async function phonePool<T>(input: PoolInput<T>): Promise<PoolStop<T> | null> {
  const state: PoolState<T> = {
    stop: null, started: new Set(), running: new Set(), last: new Map(),
  };
  for (const item of input.items) {
    await freeSlot(input, state);
    if (state.stop) break;
    launch(input, state, item);
  }
  await Promise.all(state.running);
  const { stop } = state;
  return stop && { ...stop, rest: input.items.filter((i) => !state.started.has(i)) };
}
