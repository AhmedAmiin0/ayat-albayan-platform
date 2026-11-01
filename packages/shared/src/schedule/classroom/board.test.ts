import { describe, expect, it } from 'vitest';
import { boardMessageSchema, boardStrokeSchema, PEN_COLORS, type BoardStroke } from './board.js';

const stroke: BoardStroke = {
  id: 's1', by: 'me', color: 'lapis', width: 0.004, erase: false, pts: [0, 0.5, 1, 1],
};
const ok = (v: unknown) => boardMessageSchema.safeParse(v).success;

describe('boardStrokeSchema', () => {
  it('takes every pen colour and nothing else', () => {
    for (const color of PEN_COLORS) {
      expect(boardStrokeSchema.safeParse({ ...stroke, color }).success).toBe(true);
    }
    expect(boardStrokeSchema.safeParse({ ...stroke, color: 'pink' }).success).toBe(false);
  });

  it('keeps coordinates and width within 0..1, in pairs', () => {
    expect(boardStrokeSchema.safeParse({ ...stroke, pts: [0.1, 1.2] }).success).toBe(false);
    expect(boardStrokeSchema.safeParse({ ...stroke, pts: [-0.1, 0] }).success).toBe(false);
    expect(boardStrokeSchema.safeParse({ ...stroke, pts: [0.1, 0.2, 0.3] }).success).toBe(false);
    expect(boardStrokeSchema.safeParse({ ...stroke, width: 2 }).success).toBe(false);
  });

  it('drops keys a stroke does not have', () => {
    expect(boardStrokeSchema.parse({ ...stroke, extra: 1 })).toEqual(stroke);
  });
});

describe('boardMessageSchema', () => {
  it('reads each kind', () => {
    expect(ok({ t: 'draw', stroke })).toBe(true);
    expect(ok({ t: 'undo', id: 's1' })).toBe(true);
    expect(ok({ t: 'clear' })).toBe(true);
    expect(ok({ t: 'perm', studentsCanDraw: true })).toBe(true);
    expect(ok({ t: 'open', open: false })).toBe(true);
    expect(ok({ t: 'allow', who: 'g', allow: false })).toBe(true);
    expect(ok({ t: 'sync-request' })).toBe(true);
    expect(ok({ t: 'sync', strokes: [stroke], studentsCanDraw: false, open: true, allowed: ['g'] })).toBe(true);
  });

  it('refuses an unknown kind, a list, a null and a wrong field', () => {
    expect(ok({ t: 'nope' })).toBe(false);
    expect(ok([{ t: 'clear' }])).toBe(false);
    expect(ok(null)).toBe(false);
    expect(ok({ t: 'undo', id: 1 })).toBe(false);
    expect(ok({ t: 'sync', strokes: [], studentsCanDraw: false, open: false, allowed: null })).toBe(false);
  });

  it('a sync without `allowed` (an older client) reads as nobody allowed by name', () => {
    expect(boardMessageSchema.parse({ t: 'sync', strokes: [], studentsCanDraw: true, open: true })).toEqual({
      t: 'sync', strokes: [], studentsCanDraw: true, open: true, allowed: [],
    });
  });
});
