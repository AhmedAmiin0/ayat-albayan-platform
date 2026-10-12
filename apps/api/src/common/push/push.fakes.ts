import { vi } from 'vitest';
import type { Db } from '../db/db.module';
import type { ExpoTicket } from './expo-push';
import type { WebPushSender } from './web-push.sender';

/** Tests only. A profile as PushService reads it. */
export type FakeProfile = { id: string; role: string; push_tokens: string[] };

/**
 * A minimal supabase-js double: profiles select (eq role / in ids), push_notifications upsert/update,
 * profiles update. `duplicate` = every upsert hits an existing dedup key.
 */
export function fakePushDb(profiles: FakeProfile[], opts: { duplicate?: boolean } = {}) {
  const writes: { table: string; op: string; value: unknown }[] = [];
  const from = vi.fn((table: string) => ({
    select: () => ({
      eq: async (_c: string, role: string) => ({ data: profiles.filter((p) => p.role === role), error: null }),
      in: async (_c: string, ids: string[]) => ({ data: profiles.filter((p) => ids.includes(p.id)), error: null }),
    }),
    upsert: (value: unknown) => {
      writes.push({ table, op: 'upsert', value });
      return { select: async () => ({ data: opts.duplicate ? [] : [{ id: `row-${writes.length}` }], error: null }) };
    },
    update: (value: unknown) => {
      writes.push({ table, op: 'update', value });
      return { eq: async () => ({ error: null }) };
    },
  }));
  return { db: { from } as unknown as Db, writes };
}

export const okTickets = (n: number): ExpoTicket[] => Array.from({ length: n }, (_, i) => ({ status: 'ok', id: `t${i}` }));

export function fakeWeb() {
  const send = vi.fn(async () => 0);
  return { web: { send } as unknown as WebPushSender, send };
}
