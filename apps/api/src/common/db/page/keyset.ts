import type { AtId, Keyset, KeysetSpec } from './page.types';

interface Direction {
  bound: 'gte' | 'lte';
  after: 'gt' | 'lt';
}

const UP: Direction = { bound: 'gte', after: 'gt' };
const DOWN: Direction = { bound: 'lte', after: 'lt' };

function past<Q extends Keyset<Q>>(query: Q, spec: KeysetSpec, cursor: AtId): Q {
  const { bound, after } = spec.ascending ? UP : DOWN;
  const key = spec.key ?? 'id';
  const { column } = spec;
  return query[bound](column, cursor.at).or(
    `${column}.${after}."${cursor.at}",${key}.${after}.${cursor.id}`,
  );
}

/**
 * Rows after `cursor` in the index-friendly keyset form, ordered by the column and then its key in
 * the same direction. The instant stays Postgres text so its microseconds survive.
 */
export function afterCursor<Q extends Keyset<Q>>(query: Q, spec: KeysetSpec, cursor?: AtId): Q {
  const scoped = cursor ? past(query, spec, cursor) : query;
  const { ascending } = spec;
  return scoped.order(spec.column, { ascending }).order(spec.key ?? 'id', { ascending });
}
