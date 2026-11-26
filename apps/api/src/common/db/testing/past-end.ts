import type { FakeResult, fakeDb } from './fake-db';

const PAST_END = { code: 'PGRST103', message: 'Requested range not satisfiable' };

/** The answers PostgREST gives a page past the last row: PGRST103, then the count read. */
export const pastEnd = (total: number): FakeResult[] => [
  { error: PAST_END },
  { data: [], count: total },
];

/** Every `.range` window read on `table`, in order. */
export const rangesOn = (fake: ReturnType<typeof fakeDb>, table: string): unknown[][] =>
  fake.calls.filter((c) => c.table === table && c.method === 'range').map((c) => c.args);
