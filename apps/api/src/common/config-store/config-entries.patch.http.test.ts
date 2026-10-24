import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SINGLETON_ENTITY_ID } from '../audit/singleton-entity';
import { configEntriesApp, USERS } from './config-entries.test-util';
import { configRow } from './config-store.fakes';
import { ConfigConflictError } from './config-store.types';

describe('PATCH /config/entries/:key (docs/26 §2f)', () => {
  let h: Awaited<ReturnType<typeof configEntriesApp>>;
  let app: NestFastifyApplication;
  const patch = (key: string, body: object, token: 'admin' | 'teacher' | 'editor' = 'admin') =>
    h.call({ method: 'PATCH', url: `/config/entries/${key}`, body, token });
  const rows = (...r: ReturnType<typeof configRow>[]) => {
    h.store.fresh.mockResolvedValue({ rev: 1, rows: r });
  };

  beforeAll(async () => {
    h = await configEntriesApp();
    app = h.app;
  });
  afterAll(() => app.close());
  beforeEach(() => {
    h.store.set.mockReset().mockResolvedValue(undefined);
    h.audit.record.mockClear();
    rows(configRow('upload_max_mb', 4, { version: 7 }));
    h.store.names.mockResolvedValue(new Map([['admin-1', 'منى']]));
  });

  it('saves one key at its version and answers the row after; audited like PATCH /settings', async () => {
    const res = await patch('upload_max_mb', { value: 8, expectedVersion: 7 });
    expect(res.statusCode).toBe(200);
    expect(h.store.set).toHaveBeenCalledExactlyOnceWith([{ key: 'upload_max_mb', value: 8, expectedVersion: 7 }], USERS['admin']?.id);
    expect(res.json().entry).toMatchObject({ key: 'upload_max_mb', version: 7, updatedByName: 'منى', bounds: { min: 1, max: 10 } });
    expect(h.audit.record).toHaveBeenCalledWith(expect.objectContaining({
      entity: 'settings', entityId: SINGLETON_ENTITY_ID, action: 'update', before: { upload_max_mb: 4 }, after: { upload_max_mb: 8 },
    }));
  });

  it('a custom role holding settings.write may save; a teacher is 403; a bad body is 400', async () => {
    expect((await patch('upload_max_mb', { value: 8, expectedVersion: 7 }, 'editor')).statusCode).toBe(200);
    expect((await patch('upload_max_mb', { value: 8, expectedVersion: 7 }, 'teacher')).statusCode).toBe(403);
    expect((await patch('upload_max_mb', { value: 8 })).statusCode).toBe(400);
  });

  it('404 unknown_key', async () => {
    const res = await patch('no_such_key', { value: 1, expectedVersion: 0 });
    expect([res.statusCode, res.json().code]).toEqual([404, 'unknown_key']);
  });

  it.each([
    ['messaging_enabled', true, 'messages_gate'],
    ['auto_messages_enabled', true, 'messages_gate'],
    ['crm_cutover_done', true, 'messages_gate'],
    ['comms_source', 'module', 'communications'],
    ['google_sync_enabled', true, 'google_sync'],
    ['google_sync_mode', 'live', 'google_sync'],
  ])('409 owned_by_module for %s: nothing is written', async (key, value, ownedBy) => {
    const res = await patch(key, { value, expectedVersion: 0 });
    expect([res.statusCode, res.json()]).toEqual([409, expect.objectContaining({ code: 'owned_by_module', ownedBy })]);
    expect(h.store.set).not.toHaveBeenCalled();
  });

  it('422 invalid with the issues (out of range, wrong type, null on a non-nullable key)', async () => {
    for (const value of [11, '4', null]) {
      const res = await patch('upload_max_mb', { value, expectedVersion: 7 });
      expect([res.statusCode, res.json().code]).toEqual([422, 'invalid']);
      expect(res.json().issues.length).toBeGreaterThan(0);
    }
    expect(h.store.set).not.toHaveBeenCalled();
  });

  it('null on a nullable key stores JSON null (the default), never a delete', async () => {
    rows(configRow('late_cancel_hours', 12, { version: 3 }));
    expect((await patch('late_cancel_hours', { value: null, expectedVersion: 3 })).statusCode).toBe(200);
    expect(h.store.set).toHaveBeenCalledWith([{ key: 'late_cancel_hours', value: null, expectedVersion: 3 }], expect.any(String));
  });

  it('428 confirmation_required when a typed key starts deleting without the typed number', async () => {
    rows();
    for (const confirmText of [undefined, '30', ' ٣٠ ']) {
      const res = await patch('recording_retention_days', { value: 90, expectedVersion: 0, ...(confirmText ? { confirmText } : {}) });
      expect([res.statusCode, res.json().code]).toEqual([428, 'confirmation_required']);
    }
    expect(h.store.set).not.toHaveBeenCalled();
  });

  it('the typed number is accepted in ASCII or Arabic-Indic digits; lengthening needs none', async () => {
    rows();
    expect((await patch('recording_retention_days', { value: 90, expectedVersion: 0, confirmText: ' ٩٠ ' })).statusCode).toBe(200);
    expect((await patch('activity_retention_days', { value: 30, expectedVersion: 0, confirmText: '30' })).statusCode).toBe(200);
    rows(configRow('recording_retention_days', 90, { version: 5 }));
    expect((await patch('recording_retention_days', { value: 120, expectedVersion: 5 })).statusCode).toBe(200);
    expect((await patch('recording_retention_days', { value: null, expectedVersion: 5 })).statusCode).toBe(200);
  });

  it('409 conflict on a stale version: the current value, version and who changed it', async () => {
    const res = await patch('upload_max_mb', { value: 8, expectedVersion: 6 });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'conflict', key: 'upload_max_mb', current: 4, version: 7, updatedAt: '2026-10-23T10:00:00.000Z', updatedByName: 'منى' });
    expect(h.store.set).not.toHaveBeenCalled();
  });

  it('409 conflict when config_set itself loses the race (P0409)', async () => {
    h.store.set.mockRejectedValueOnce(new ConfigConflictError('upload_max_mb', 9));
    const res = await patch('upload_max_mb', { value: 8, expectedVersion: 7 });
    expect([res.statusCode, res.json().code]).toEqual([409, 'conflict']);
    expect(h.audit.record).not.toHaveBeenCalled();
  });

  it('a missing row accepts version 0', async () => {
    rows();
    expect((await patch('upload_max_mb', { value: 8, expectedVersion: 0 })).statusCode).toBe(200);
    expect((await patch('upload_max_mb', { value: 8, expectedVersion: 1 })).statusCode).toBe(409);
  });
});
