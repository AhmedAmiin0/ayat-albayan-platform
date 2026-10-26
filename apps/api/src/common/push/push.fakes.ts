import { vi } from 'vitest';
import { fakePolicy } from '../../modules/messaging/notification-rules/policy/policy.fakes';
import type { NotificationPolicy } from '../../modules/messaging/notification-rules/policy/policy';
import { systemResolver, type PermissionResolver } from '../auth/permissions';
import type { Db } from '../db/db.module';
import type { ExpoTicket } from './expo/expo-push';
import { PushAudience } from './dispatch/push.audience';
import { PushChannels } from './dispatch/push.channels';
import { PushService, type PushTransport } from './push.service';
import type { WebPushSender } from './web/web-push.sender';

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

/** A push_device_sessions row (migration 700). */
export type FakeBinding = { token: string; profile_id: string; session_id: string; contested_at?: string | null };

export interface FakePushOptions {
  /** Every upsert hits an existing dedup key. */
  duplicate?: boolean;
  /** Default: every profile token bound to its profile, session 'live'. */
  bindings?: FakeBinding[];
  /** Sessions push_live_sessions answers as live; default ['live']. */
  live?: string[];
}

/**
 * A minimal supabase-js double: profiles select (eq role / in ids, then .is('disabled_at', null)),
 * push_device_sessions select, rpc push_live_sessions, push_notifications upsert/update, profiles update.
 */
export function fakePushDb(profiles: FakeProfile[], opts: FakePushOptions = {}) {
  const writes: { table: string; op: string; value: unknown }[] = [];
  const bindings = opts.bindings ?? profiles.flatMap((p) => p.push_tokens.map((token) => ({ token, profile_id: p.id, session_id: 'live' })));
  const live = opts.live ?? ['live'];
  const rpc = vi.fn(async (_fn: string, args: { p_ids: string[] }) => ({ data: args.p_ids.filter((id) => live.includes(id)), error: null }));
  const from = vi.fn((table: string) => ({
    select: () => ({
      eq: (_c: string, role: string) => enabled(profiles.filter((p) => p.role === role)),
      in: (_c: string, ids: string[]) =>
        table === 'push_device_sessions'
          ? Promise.resolve({ data: bindings.filter((b) => ids.includes(b.token)), error: null })
          : enabled(profiles.filter((p) => ids.includes(p.id))),
    }),
    upsert: (value: unknown) => {
      writes.push({ table, op: 'upsert', value });
      return { select: async () => ({ data: opts.duplicate ? [] : [{ id: `row-${writes.length}` }], error: null }) };
    },
    delete: () => ({
      in: async (_c: string, value: unknown) => (writes.push({ table, op: 'delete', value }), { error: null }),
    }),
    update: (value: unknown) => {
      writes.push({ table, op: 'update', value });
      return { eq: async () => ({ error: null }) };
    },
  }));
  return { db: { from, rpc } as unknown as Db, writes, rpc };
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
