import type { HttpFailure } from './failure';

// A profile's status → domain error mapping, as data (docs/36 H-3): no if-chains in the callers.

type TableKey = number | '4xx' | '5xx' | 'timeout' | 'network' | 'shape';
type Build<E extends Error> = (failure: HttpFailure) => E;

export type ErrorTable<E extends Error> = Partial<Record<TableKey, Build<E>>> & {
  default: Build<E>;
};

const BANDS: Readonly<Record<string, '4xx' | '5xx'>> = { '4': '4xx', '5': '5xx' };

/** 404 → '4xx', 503 → '5xx', anything else no band. */
function bandOf(status: number): readonly TableKey[] {
  const digit = String(status).charAt(0);
  const band = Object.hasOwn(BANDS, digit) ? BANDS[digit] : undefined;
  return band === undefined ? [] : [band];
}

/** The keys to try, in order: a status failure by exact status then its band; others by kind. */
function keysOf(failure: HttpFailure): readonly TableKey[] {
  return failure.kind === 'status' ? [failure.status, ...bandOf(failure.status)] : [failure.kind];
}

/** Lookup order: exact status → '4xx' | '5xx' → the failure kind → default. */
export function errorFor<E extends Error>(table: ErrorTable<E>, failure: HttpFailure): E {
  const build = keysOf(failure)
    .map((key) => table[key])
    .find((entry): entry is Build<E> => entry !== undefined);
  return (build ?? table.default)(failure);
}
