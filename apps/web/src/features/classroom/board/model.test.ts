import { describe, expect, it } from 'vitest';
import { canAllowStudents, canDraw, canManageBoard, lastStrokeOf, normalize, round4, strokeId, type Stroke } from './model';

const stroke = (id: string, by: string): Stroke => ({ id, by, color: 'ink', width: 0.004, erase: false, pts: [0, 0] });

describe('board model', () => {
  it('teacher, admin and assistant draw; a guest only when allowed; sales and unknown never', () => {
    for (const role of ['teacher', 'admin', 'assistant'] as const) expect(canDraw(role, false)).toBe(true);
    expect(canDraw('guest', false)).toBe(false);
    expect(canDraw('guest', true)).toBe(true);
    expect(canDraw('sales', true)).toBe(false);
    expect(canDraw(null, true)).toBe(false);
  });

  it('the staff manage the board; only teacher and admin allow students', () => {
    expect(canManageBoard('assistant')).toBe(true);
    expect(canManageBoard('guest')).toBe(false);
    expect(canManageBoard(null)).toBe(false);
    expect(canAllowStudents('teacher')).toBe(true);
    expect(canAllowStudents('admin')).toBe(true);
    expect(canAllowStudents('assistant')).toBe(false);
    expect(canAllowStudents('guest')).toBe(false);
  });

  it('normalises a pointer to 0..1 of the element, clamped and rounded to 4 decimals', () => {
    const rect = { left: 100, top: 50, width: 800, height: 450 };
    expect(normalize({ x: 500, y: 275 }, rect)).toEqual([0.5, 0.5]);
    expect(normalize({ x: 0, y: 1000 }, rect)).toEqual([0, 1]);
    expect(normalize({ x: 100 + 800 / 3, y: 50 }, rect)).toEqual([0.3333, 0]);
    expect(normalize({ x: 1, y: 1 }, { left: 0, top: 0, width: 0, height: 0 })).toEqual([0, 0]);
    expect(round4(0.123456)).toBe(0.1235);
  });

  it('finds the newest stroke of one author', () => {
    const list = [stroke('a1', 'a'), stroke('b1', 'b'), stroke('a2', 'a'), stroke('b2', 'b')];
    expect(lastStrokeOf(list, 'a')?.id).toBe('a2');
    expect(lastStrokeOf(list, 'c')).toBeUndefined();
  });

  it('stroke ids carry the author and differ per stroke', () => {
    expect(strokeId('me', 1)).toMatch(/^me#1\./);
    expect(strokeId('me', 1)).not.toBe(strokeId('me', 2));
  });
});
