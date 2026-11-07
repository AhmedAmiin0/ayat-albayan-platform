import type { Tx } from '../../support/core/rls';

// Shared by the inbox realtime SQL specs (migrations 860, 20261107000100, 20261107000200). The e2e
// stack runs without the Realtime service, so the sender public.inbox_live_send_events is replaced
// inside the rolled-back transaction by one that records the events the trigger hands it.

/** One tellable row of an event (migration 20261107000200). */
export interface LiveRow {
  id: string;
  s: string;
  d: string;
  at: string;
}

/** One 'thread_changed' payload: the phone, and its rows when every staff reader may see them. */
export interface LiveEvent {
  phone: string;
  rows?: LiveRow[];
}

const byPhone = (a: LiveEvent, b: LiveEvent) => a.phone.localeCompare(b.phone);

/** Records each call of the sender: the events of one statement, sorted by phone. */
export async function captureEvents(tx: Tx): Promise<() => Promise<LiveEvent[][]>> {
  await tx.unsafe(`create temp table live_sent (id serial, events jsonb[]) on commit drop;
    create or replace function public.inbox_live_send_events(p_events jsonb[]) returns void
      language sql set search_path = '' as $$
        insert into pg_temp.live_sent (events) values (p_events) $$;`);
  return async () =>
    (await tx<{ events: LiveEvent[] }[]>`select events from pg_temp.live_sent order by id`).map(
      (r) => [...r.events].sort(byPhone),
    );
}

/** Records each call of the sender as its phones only (one sorted array per statement). */
export async function captureSends(tx: Tx): Promise<() => Promise<string[][]>> {
  const events = await captureEvents(tx);
  return async () => (await events()).map((list) => list.map((e) => e.phone));
}
