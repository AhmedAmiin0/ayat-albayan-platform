import { describe, expect, it } from 'vitest';
import { packageSlot, type SlotPackage } from './pdf-model';

const pkg = (id: string, lessonsTotal: number, at: { startsOn: string; createdAt?: string }): SlotPackage => ({
  id,
  lessonsTotal,
  startsOn: at.startsOn,
  createdAt: at.createdAt ?? `${at.startsOn}T08:00:00Z`,
});

describe('packageSlot — «رقم الحلقة 6 من 8» (R-REP-03, FIFO as migration 123)', () => {
  const two = [pkg('b', 8, { startsOn: '2026-10-01' }), pkg('a', 4, { startsOn: '2026-09-01' })];

  it('the first package takes the first units, in starts_on order', () => {
    expect(packageSlot(1, two)).toEqual({ position: 1, total: 4 });
    expect(packageSlot(4, two)).toEqual({ position: 4, total: 4 });
  });

  it('the next unit opens the next package', () => {
    expect(packageSlot(5, two)).toEqual({ position: 1, total: 8 });
    expect(packageSlot(10, two)).toEqual({ position: 6, total: 8 });
  });

  it('past every package the overflow stays on the newest (position above total)', () => {
    expect(packageSlot(14, two)).toEqual({ position: 10, total: 8 });
  });

  it('same start day: created_at, then id, break the tie', () => {
    const tied = [
      pkg('z', 4, { startsOn: '2026-09-01', createdAt: '2026-09-01T10:00:00Z' }),
      pkg('y', 8, { startsOn: '2026-09-01', createdAt: '2026-09-01T09:00:00Z' }),
    ];
    expect(packageSlot(8, tied)).toEqual({ position: 8, total: 8 });
    expect(packageSlot(9, tied)).toEqual({ position: 1, total: 4 });
    const sameInstant = [pkg('d', 4, { startsOn: '2026-09-01' }), pkg('c', 2, { startsOn: '2026-09-01' })];
    expect(packageSlot(2, sameInstant)).toEqual({ position: 2, total: 2 });
  });

  it('no package unit used (trial, excused, not chargeable) or no package at all → null', () => {
    expect(packageSlot(null, two)).toBeNull();
    expect(packageSlot(0, two)).toBeNull();
    expect(packageSlot(3, [])).toBeNull();
  });

  it('does not reorder the caller array', () => {
    const input = [...two];
    packageSlot(5, input);
    expect(input.map((p) => p.id)).toEqual(['b', 'a']);
  });
});
