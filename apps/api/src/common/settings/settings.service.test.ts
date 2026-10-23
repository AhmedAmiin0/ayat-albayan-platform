import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../db/db.module';
import { SettingsService } from './settings.service';

type Rows = { key: string; value: unknown }[];

/** A db whose select('key, value') answers `rows` (or an error), counting the reads. */
function service(rows: Rows | { error: string }, ttlMs = 30_000) {
  const result = Array.isArray(rows) ? { data: rows, error: null } : { data: null, error: { message: rows.error } };
  const select = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockResolvedValue({ error: null });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const del = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select, upsert, delete: del });
  return { svc: new SettingsService({ from } as unknown as Db, ttlMs), select, upsert, eq };
}

describe('SettingsService.all (R-SCH-07, R-SCH-02)', () => {
  it('is storage only: no per-key getter (modules read through their typed readers)', () => {
    const methods = Object.getOwnPropertyNames(SettingsService.prototype).filter((m) => m !== 'constructor');
    expect(methods.sort()).toEqual(['all', 'invalidate', 'load', 'publicView', 'write']);
  });

  it('reads the stored values', async () => {
    const { svc } = service([{ key: 'late_cancel_hours', value: 12 }, { key: 'booking_horizon_weeks', value: 8 }]);
    expect(await svc.all()).toMatchObject({ late_cancel_hours: 12, booking_horizon_weeks: 8, join_opens_before_min: 15 });
  });

  it.each([
    ['a missing row', []],
    ['a string', [{ key: 'late_cancel_hours', value: '12' }]],
    ['a negative number', [{ key: 'late_cancel_hours', value: -1 }]],
  ])('late cancel is null (off) for %s', async (_name, rows) => {
    expect((await service(rows).svc.all()).late_cancel_hours).toBeNull();
  });

  it('horizon falls back to 5 for zero; sales auto-assign defaults to true', async () => {
    const { svc } = service([{ key: 'booking_horizon_weeks', value: 0 }]);
    expect(await svc.all()).toMatchObject({ booking_horizon_weeks: 5, sales_auto_assign: true });
  });

  it('throws on a DB error instead of guessing, and does not cache the failure', async () => {
    const { svc, select } = service({ error: 'boom' });
    await expect(svc.all()).rejects.toThrow(/boom/);
    select.mockResolvedValue({ data: [], error: null });
    expect((await svc.all()).booking_horizon_weeks).toBe(5);
  });
});

describe('SettingsService cache', () => {
  it('one query serves every read within the TTL; after it, the rows are read again', async () => {
    const { svc, select } = service([{ key: 'upload_max_mb', value: 4 }], 1_000);
    expect((await svc.all(0)).upload_max_mb).toBe(4);
    await svc.all(999);
    expect(select).toHaveBeenCalledTimes(1);
    await svc.all(1_000);
    expect(select).toHaveBeenCalledTimes(2);
  });

  it('a write invalidates at once: the next read sees the new value', async () => {
    const { svc, select } = service([{ key: 'join_closes_after_min', value: 120 }]);
    expect((await svc.all()).join_closes_after_min).toBe(120);
    select.mockResolvedValue({ data: [{ key: 'join_closes_after_min', value: 30 }], error: null });
    expect((await svc.all()).join_closes_after_min).toBe(120); // still cached
    await svc.write({ join_closes_after_min: 30 }, 'admin-1');
    expect((await svc.all()).join_closes_after_min).toBe(30);
  });

  it('TTL 0 (e2e) reads every time; callers get a copy they may change', async () => {
    const { svc, select } = service([], 0);
    const a = await svc.all();
    a.upload_max_mb = 1;
    expect((await svc.all()).upload_max_mb).toBe(10);
    expect(select).toHaveBeenCalledTimes(2);
  });

  it('publicView returns only the public keys', async () => {
    const view = await service([{ key: 'academy_whatsapp_e164', value: '+201001234567' }]).svc.publicView();
    expect(view).toMatchObject({ academy_whatsapp_e164: '+201001234567', join_opens_before_min: 15 });
    expect(view).not.toHaveProperty('messaging_enabled');
  });
});

describe('SettingsService.write (PATCH /settings)', () => {
  it('upserts values stamped with the admin; null deletes the row (reads back as OFF)', async () => {
    const { svc, upsert, eq } = service([]);
    await svc.write({ booking_horizon_weeks: 6, late_cancel_hours: null }, 'admin-1');
    expect(upsert).toHaveBeenCalledWith({ key: 'booking_horizon_weeks', value: 6, updated_by: 'admin-1' });
    expect(eq).toHaveBeenCalledWith('key', 'late_cancel_hours');
  });

  it('all() fills defaults (docs/11 §2)', async () => {
    const all = await service([{ key: 'renewal_alert_remaining', value: 3 }]).svc.all();
    expect(all).toEqual({ ...SETTING_DEFAULTS, renewal_alert_remaining: 3 });
  });
});
