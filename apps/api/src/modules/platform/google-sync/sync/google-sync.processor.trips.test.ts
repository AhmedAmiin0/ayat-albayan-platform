import { describe, expect, it, vi } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import type { GoogleAlerts } from '../google-alerts';
import type { GoogleClientFactory } from '../google-client.port';
import { GoogleData } from '../google-data';
import { GoogleSettings } from '../google-settings';
import { FakeGoogle } from '../http/google-client.fake';
import { GoogleAccountQueries } from '../oauth/google-account.queries';
import { GoogleConnection } from '../oauth/google-connection';
import { GoogleItemsQueries } from './google-items.queries';
import { GoogleSyncProcessor } from './google-sync.processor';
import type { GoogleWriters } from './google-writers';

const LIVE = { data: [{ key: 'google_sync_enabled', value: true }, { key: 'google_sync_mode', value: 'live' }] };
const OFF = { data: [{ key: 'google_sync_enabled', value: false }] };
const factory: GoogleClientFactory = { client: () => new FakeGoogle() as never, oauth: () => ({}) as never };

/** The real settings / account / outbox queries on a counting fake db (one `trips` entry = one round trip). */
function setup(results: Parameters<typeof fakeDb>[0]) {
  const fake = fakeDb(results);
  const account = new GoogleAccountQueries(fake.db);
  const settings = new GoogleSettings(fake.db, 30_000);
  const connection = new GoogleConnection(account, factory, { disconnected: vi.fn() } as unknown as GoogleAlerts);
  const data = new GoogleData(account, settings, new GoogleItemsQueries(fake.db));
  const writers = { of: () => ({ write: vi.fn() }) } as unknown as GoogleWriters;
  return { ...fake, settings, connection, p: new GoogleSyncProcessor(data, connection, writers) };
}

const claims = (n: number) => Array.from({ length: n }, () => ({ data: [] }));

describe('GoogleSyncProcessor — round trips per idle tick (owner 2026-10-27: settings, google_account, token per minute)', () => {
  it('live and connected, nothing queued: 5 round trips on the first tick, then 2 (the claim + last_run_at; was 5 every tick)', async () => {
    const { p, trips } = setup({ settings: [LIVE], google_account: [{ data: { status: 'connected' } }], 'rpc:google_token_read': [{ data: 'refresh' }], 'rpc:google_sync_claim': claims(3) });
    await p.runOnce();
    expect(trips).toEqual(['settings', 'google_account', 'rpc:google_token_read', 'rpc:google_sync_claim', 'google_account']);
    trips.length = 0;
    await p.runOnce();
    await p.runOnce();
    expect(trips).toEqual(['rpc:google_sync_claim', 'google_account', 'rpc:google_sync_claim', 'google_account']);
  });

  it('an admin OFF (GoogleSettings.write) applies on the very next tick: the cache is dropped', async () => {
    const { p, settings, trips } = setup({ settings: [LIVE, {}, OFF], google_account: [{ data: { status: 'connected' } }], 'rpc:google_token_read': [{ data: 'refresh' }], 'rpc:google_sync_claim': claims(1) });
    await p.runOnce();
    await settings.write({ values: { enabled: false }, actorId: 'a1' });
    trips.length = 0;
    await expect(p.runOnce()).resolves.toMatchObject({ claimed: 0 });
    expect(trips).toEqual(['settings']);
  });

  it('a raw SQL OFF: read() keeps the cached value for the TTL, fresh() (the per-item stop) sees it at once', async () => {
    const { settings, trips } = setup({ settings: [LIVE, OFF] });
    await expect(settings.read()).resolves.toMatchObject({ enabled: true });
    await expect(settings.read()).resolves.toMatchObject({ enabled: true });
    await expect(settings.fresh()).resolves.toMatchObject({ enabled: false });
    expect(trips).toEqual(['settings', 'settings']);
  });

  it('connect / disconnect / a refused token (forget) re-read the account and Vault on the next tick', async () => {
    const { connection, trips } = setup({ google_account: [{ data: { status: 'connected' } }, { data: { status: 'disconnected' } }], 'rpc:google_token_read': [{ data: 'refresh' }] });
    await expect(connection.client()).resolves.not.toBeNull();
    await expect(connection.client()).resolves.not.toBeNull();
    connection.forget();
    await expect(connection.client()).resolves.toBeNull();
    expect(trips).toEqual(['google_account', 'rpc:google_token_read', 'google_account']);
  });

  it('SETTINGS_CACHE_MS 0 (e2e, whose reset clears the token in SQL): the account and Vault are read on every call', async () => {
    const { connection, trips } = setup({ google_account: [{ data: { status: 'connected' } }, { data: { status: 'connected' } }], 'rpc:google_token_read': [{ data: 'a' }, { data: 'b' }] });
    Object.assign(connection, { settingsTtlMs: 0 });
    await connection.client();
    await connection.client();
    expect(trips).toEqual(['google_account', 'rpc:google_token_read', 'google_account', 'rpc:google_token_read']);
  });

  it('a refused token: the cache is dropped again after the clear + status writes, so a client() in between keeps nothing', async () => {
    const { connection, trips } = setup({ google_account: [{ data: { status: 'connected' } }, {}, { data: { status: 'disconnected' } }], 'rpc:google_token_read': [{ data: 'old' }] });
    const failing = connection.authFailed();
    await connection.client(); // lands between forget() and the writes
    await failing;
    await expect(connection.client()).resolves.toBeNull();
    expect(trips.filter((t) => t === 'google_account')).toHaveLength(3);
  });
});
