import { SEED_ENTRIES, SETTING_KEYS } from '@ab/shared';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SINGLETON_ENTITY_ID } from '../../audit/singleton-entity';
import { configEntriesApp, USERS, type Token } from './config-entries.test-util';
import { configRow } from '../config-store.fakes';

type Entry = { key: string; version: number; stored: boolean; value: unknown; updatedAt: string | null; updatedByName: string | null };

describe('GET /config/entries, PUT …/description, GET /admin/config/parity', () => {
  let h: Awaited<ReturnType<typeof configEntriesApp>>;
  let app: NestFastifyApplication;
  const list = async (token: Token = 'admin') => {
    const res = await h.call({ method: 'GET', url: '/config/entries', token });
    return { status: res.statusCode, entries: res.statusCode === 200 ? (res.json().entries as Entry[]) : [] };
  };
  const describeKey = (key: string, text: string | null, token: Token = 'admin') =>
    h.call({ method: 'PUT', url: `/config/entries/${key}/description`, body: { text }, token });

  beforeAll(async () => {
    h = await configEntriesApp();
    app = h.app;
  });
  afterAll(() => app.close());
  beforeEach(() => {
    h.audit.record.mockClear();
    h.store.describe.mockClear();
    const snap = { rev: 1, rows: [configRow('upload_max_mb', 4, { version: 7 }), configRow('fx_fresh_hours', null, { updatedBy: null })] };
    h.store.snapshot.mockResolvedValue(snap);
    h.store.fresh.mockResolvedValue(snap);
    h.store.names.mockResolvedValue(new Map([['admin-1', 'منى']]));
  });

  it('every seed key for a base admin; a missing row is version 0 with the default; a teacher is 403', async () => {
    const { entries } = await list();
    expect(entries.map((e) => e.key)).toEqual(SEED_ENTRIES.map((e) => e.key));
    expect(entries.find((e) => e.key === 'upload_max_mb')).toMatchObject({ value: 4, version: 7, stored: true, updatedByName: 'منى' });
    expect(entries.find((e) => e.key === 'booking_horizon_weeks')).toMatchObject({ value: 5, version: 0, stored: false, updatedAt: null });
    expect((await list('teacher')).status).toBe(403);
  });

  it('a seeded row nobody wrote (JSON null, no writer) shows no «changed by»', async () => {
    expect((await list()).entries.find((e) => e.key === 'fx_fresh_hours')).toMatchObject({ stored: false, updatedAt: null, updatedByName: null, version: 1 });
  });

  it('the Google rows are listed to base admins only', async () => {
    const keys = (await list('editor')).entries.map((e) => e.key);
    expect(keys).toEqual(SEED_ENTRIES.map((e) => e.key).filter((k) => !k.startsWith('google_')));
    expect(keys).toEqual(expect.arrayContaining(['messaging_enabled', 'comms_source']));
  });

  it('a description: config_describe for the key, audited describe:<key>, answers the row', async () => {
    const res = await describeKey('upload_max_mb', 'حد حجم الملف');
    expect(res.statusCode).toBe(200);
    expect(res.json().entry.key).toBe('upload_max_mb');
    expect(h.store.describe).toHaveBeenCalledWith({ key: 'upload_max_mb', text: 'حد حجم الملف', actorId: USERS['admin']?.id });
    expect(h.audit.record).toHaveBeenCalledWith(expect.objectContaining({
      entity: 'settings', entityId: SINGLETON_ENTITY_ID, action: 'describe:upload_max_mb', after: { description: 'حد حجم الملف' },
    }));
  });

  it('null restores the seeded text; an empty or too long text is 400; unknown key 404', async () => {
    expect((await describeKey('upload_max_mb', null)).statusCode).toBe(200);
    expect(h.store.describe).toHaveBeenCalledWith(expect.objectContaining({ text: null }));
    expect((await describeKey('upload_max_mb', '  ')).statusCode).toBe(400);
    expect((await describeKey('upload_max_mb', 'x'.repeat(501))).statusCode).toBe(400);
    expect((await describeKey('nope', 'x')).json().code).toBe('unknown_key');
  });

  it.each([
    ['messaging_enabled', { admin: 200, editor: 200, numbers: 200 }],
    ['comms_source', { admin: 200, editor: 403, numbers: 200 }],
    ['google_sync_mode', { admin: 200, editor: 403, numbers: 403 }],
    ['upload_max_mb', { admin: 200, editor: 200, numbers: 200 }],
  ] as const)('description of %s needs the owner module permission', async (key, want) => {
    for (const [token, status] of Object.entries(want)) {
      expect([token, (await describeKey(key, 'نص', token as Token)).statusCode]).toEqual([token, status]);
    }
    expect((await describeKey(key, 'نص', 'teacher')).statusCode).toBe(403);
  });

  it('parity: base admin only; empty on agreeing rows', async () => {
    const res = await h.call({ method: 'GET', url: '/admin/config/parity' });
    expect(res.json()).toEqual({ diffs: [], checkedKeys: SETTING_KEYS.length });
    expect((await h.call({ method: 'GET', url: '/admin/config/parity', token: 'editor' })).statusCode).toBe(403);
  });
});
