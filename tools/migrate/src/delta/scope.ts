// --from / --only / --creates-only → what buildPlan and onlyEntities get, and the counts printed
// after planning: records recreated from orphaned import items, booking rows left out and why.
import { cachePath, readJson } from '../cache.ts';
import type { CliArgs } from '../cli.args.ts';
import { keyId } from '../keys.ts';
import { bookingSkips } from '../map/schedule/booking-slot.ts';
import { zonedToUtc } from '../time.ts';
import type { EntityName, Plan, SourceRow } from '../types.ts';
import { type OnlyScope, parseOnly } from './only.ts';
import type { RecreateScope } from './orphans.ts';

export interface RunScope {
  build: { today: string; from: string; recreate?: Omit<RecreateScope, 'tableOf'> };
  only?: OnlyScope;
}

/** UTC ISO of local midnight starting `day` in Asia/Riyadh. */
export const fromUtcOf = (day: string): string =>
  zonedToUtc({ date: day, time: '00:00', tz: 'Asia/Riyadh' }).toISOString();

/** Orphaned import items come back only under --creates-only with an explicit --only list. */
export function runScope(
  args: Pick<CliArgs, 'from' | 'only' | 'createsOnly'>,
  today: string,
): RunScope {
  const from = args.from ?? today;
  if (!args.only) return { build: { today, from } };
  const only = { only: parseOnly(args.only), fromUtc: fromUtcOf(from) };
  return { build: { today, from, ...(args.createsOnly ? { recreate: only } : {}) }, only };
}

/**
 * A new rule starts on max(starts_on, --from): the platform never books before the import date.
 * Creates only, and the hash stays the mapped one, so a re-run with the same sheets is a skip and an
 * existing rule's start is never moved (no daily update of every rule).
 */
export function clampRuleStarts<P extends Pick<Plan, 'items'>>(plan: P, from: string): P {
  const items = plan.items.map((i) => {
    const on = i.record.columns['starts_on'];
    if (
      i.key.entity !== 'schedule_rules' ||
      i.action !== 'create' ||
      typeof on !== 'string' ||
      on >= from
    )
      return i;
    return { ...i, record: { ...i.record, columns: { ...i.record.columns, starts_on: from } } };
  });
  return { ...plan, items };
}

/** Per entity: planned creates that recreate a record whose import item named a deleted row. */
export function recreatedCounts(plan: Pick<Plan, 'items'>, recreated: ReadonlySet<string>) {
  const out: Partial<Record<EntityName, number>> = {};
  for (const i of plan.items)
    if (i.action === 'create' && recreated.has(keyId(i.key)))
      out[i.key.entity] = (out[i.key.entity] ?? 0) + 1;
  return out;
}

export function logScope(o: {
  plan: Pick<Plan, 'items'>;
  recreated: ReadonlySet<string>;
  from: string;
}) {
  const sheets = {
    hub_bookings: readJson<SourceRow[]>(cachePath.sheet('hub_bookings'), []),
    book_bookings: readJson<SourceRow[]>(cachePath.sheet('book_bookings'), []),
  };
  console.log(`from ${o.from}: recreated ${JSON.stringify(recreatedCounts(o.plan, o.recreated))}`);
  console.log(`bookings left out: ${JSON.stringify(bookingSkips({ sheets, from: o.from }))}`);
}
