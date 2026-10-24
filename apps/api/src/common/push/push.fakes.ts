import { vi } from 'vitest';
import { fakePolicy } from '../../modules/notification-rules/policy.fakes';
import type { NotificationPolicy } from '../../modules/notification-rules/policy';
import { systemResolver, type PermissionResolver } from '../auth/permissions';
import type { Db } from '../db/db.module';
import type { ExpoTicket } from './expo-push';
import { PushAudience } from './push.audience';
import { PushChannels } from './push.channels';
import { PushService, type PushTransport } from './push.service';
import type { WebPushSender } from './web-push.sender';

/** Tests only. A profile as PushService reads it; disabled_at set = a disabled account. */
export type FakeProfile = {
  id: string;
  role: string;
  push_tokens: string[];
  disabled_at?: string | null;
};

const enabled = (profiles: FakeProfile[]) => ({
  is: async (_c: string, v: null) => ({
    data: profiles.filter((p) => (p.disabled_at ?? null) === v),
    error: null,
  }),
});

/**
 * A minimal supabase-js double: profiles select (eq role / in ids, then .is('disabled_at', null)),
 * push_notifications upsert/update, profiles update. `duplicate` = every upsert hits an existing dedup key.
 */
export function fakePushDb(profiles: FakeProfile[], opts: { duplicate?: boolean } = {}) {
  const writes: { table: string; op: string; value: unknown }[] = [];
  const from = vi.fn((table: string) => ({
    select: () => ({
      eq: (_c: string, role: string) => enabled(profiles.filter((p) => p.role === role)),
      in: (_c: string, ids: string[]) => enabled(profiles.filter((p) => ids.includes(p.id))),
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

/** A PushService over the fakes; the system roles' permissions unless `resolve` says otherwise. */
export function pushService(
  db: Db,
  opts: { transport?: PushTransport; web?: WebPushSender; resolve?: PermissionResolver; policy?: NotificationPolicy } = {},
): PushService {
  const channels = new PushChannels(
    db,
    opts.transport ?? vi.fn<PushTransport>(),
    opts.web ?? fakeWeb().web,
  );
  return new PushService(db, new PushAudience(db, opts.resolve ?? systemResolver, opts.policy ?? fakePolicy()), channels);
}

/** The browser and app pushes run after notify*() returns (off the request path): let them finish. */
export const flushPushes = () => new Promise((resolve) => setTimeout(resolve, 0));
