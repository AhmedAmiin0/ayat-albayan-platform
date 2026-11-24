import { describe, expect, it } from 'vitest';
import { packageSlot, type SlotPackage } from './pdf-model';

// Migration 932: one lesson taken before the platform shifts the first lesson's number.
const first: SlotPackage = { id: 'a', lessonsTotal: 8, lessonsUsedBefore: 1, startsOn: '2026-10-27', createdAt: '2026-10-27T08:00:00Z' };
const next: SlotPackage = { id: 'b', lessonsTotal: 8, startsOn: '2026-11-20', createdAt: '2026-11-20T08:00:00Z' };

describe('packageSlot with lessons used before the platform', () => {
  it('positions start after them', () => {
    expect(packageSlot(1, [first, next])).toEqual({ position: 2, total: 8 });
    expect(packageSlot(7, [first, next])).toEqual({ position: 8, total: 8 });
  });

  it('the 8th platform lesson opens the next package', () => {
    expect(packageSlot(8, [first, next])).toEqual({ position: 1, total: 8 });
  });
});
