import { describe, expect, it } from 'vitest';
import { packageSlot, type SlotPackage } from './pdf-model';

// Migration 991: a stopped package keeps its used lessons; the next starts at one.
const stopped: SlotPackage = {
  id: 'a',
  lessonsTotal: 8,
  lessonsUsedAtStop: 3,
  startsOn: '2026-10-01',
  createdAt: '2026-10-01T08:00:00Z',
};
const next: SlotPackage = { id: 'b', lessonsTotal: 8, startsOn: '2026-11-01', createdAt: '2026-11-01T08:00:00Z' };

describe('packageSlot with a stopped package', () => {
  it('its 3 held lessons stay its own', () => {
    expect(packageSlot(3, [stopped, next])).toEqual({ position: 3, total: 8 });
  });

  it('the 4th lesson opens the next package', () => {
    expect(packageSlot(4, [stopped, next])).toEqual({ position: 1, total: 8 });
    const unfrozen = { ...stopped, lessonsUsedAtStop: null };
    expect(packageSlot(4, [unfrozen, next])).toEqual({ position: 4, total: 8 });
  });
});
