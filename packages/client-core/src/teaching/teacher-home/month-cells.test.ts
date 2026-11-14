import { describe, expect, it } from 'vitest';
import { monthCells } from './month-cells.js';

describe('monthCells', () => {
  it('marks today, the picked day and the counts', () => {
    const days = new Map([['2026-11-14', [1, 2]]]);
    const weeks = monthCells('2026-11', { today: '2026-11-14', picked: '2026-11-20', days });
    const flat = weeks.flat();
    expect(flat.find((c) => c.date === '2026-11-14')).toMatchObject({ today: true, picked: false, count: 2 });
    expect(flat.find((c) => c.date === '2026-11-20')).toMatchObject({ today: false, picked: true, count: 0 });
    expect(flat.filter((c) => c.today)).toHaveLength(1);
    expect(weeks[0]?.[0]).toMatchObject({ date: '2026-10-31', inMonth: false });
  });
});
