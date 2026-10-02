import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../db/db.module';
import { SettingsService } from './settings.service';

function service(result: { data: { value: unknown } | null; error: { message: string } | null }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { svc: new SettingsService({ from } as unknown as Db), from, eq };
}
const row = (value: unknown) => ({ data: { value }, error: null });

describe('SettingsService.lateCancelHours (R-SCH-07)', () => {
  it('reads the stored number', async () => {
    const { svc, from, eq } = service(row(12));
    expect(await svc.lateCancelHours()).toBe(12);
    expect(from).toHaveBeenCalledWith('settings');
    expect(eq).toHaveBeenCalledWith('key', 'late_cancel_hours');
  });

  it.each([
    ['JSON null (seeded: policy off)', row(null)],
    ['a missing row', { data: null, error: null }],
    ['a string', row('12')],
    ['a negative number', row(-1)],
  ])('is null (off) for %s', async (_name, result) => {
    expect(await service(result).svc.lateCancelHours()).toBeNull();
  });
});

describe('SettingsService.bookingHorizonWeeks (R-SCH-02)', () => {
  it('reads the stored number of weeks', async () => {
    expect(await service(row(8)).svc.bookingHorizonWeeks()).toBe(8);
  });

  it.each([
    ['a missing row', { data: null, error: null }],
    ['zero', row(0)],
    ['a fraction', row(2.5)],
  ])('falls back to 5 for %s', async (_name, result) => {
    expect(await service(result).svc.bookingHorizonWeeks()).toBe(5);
  });

  it('throws on a DB error instead of guessing', async () => {
    const { svc } = service({ data: null, error: { message: 'boom' } });
    await expect(svc.bookingHorizonWeeks()).rejects.toThrow(/boom/);
  });
});

describe('SettingsService.write (PATCH /settings)', () => {
  it('upserts numbers stamped with the admin; null deletes the row (reads back as OFF)', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert, delete: del });
    const svc = new SettingsService({ from } as unknown as Db);
    await svc.write({ booking_horizon_weeks: 6, late_cancel_hours: null }, 'admin-1');
    expect(upsert).toHaveBeenCalledWith({ key: 'booking_horizon_weeks', value: 6, updated_by: 'admin-1' });
    expect(eq).toHaveBeenCalledWith('key', 'late_cancel_hours');
  });
});
