import { describe, expect, it } from 'vitest';
import type { BoardMessage } from './messages';
import { EMPTY_BOARD, type BoardState, type Stroke } from './model';
import { boardReducer, shouldAnswerSync, type BoardInput } from './reducer';

const stroke = (id: string, by: string, pts = [0.1, 0.1]): Stroke => ({ id, by, color: 'ink', width: 0.004, erase: false, pts });
const teacher: BoardInput['from'] = { identity: 't', role: 'teacher' };
const guest: BoardInput['from'] = { identity: 'g', role: 'guest' };
const assistant: BoardInput['from'] = { identity: 'a', role: 'assistant' };
const run = (state: BoardState, ...inputs: BoardInput[]) => inputs.reduce(boardReducer, state);

describe('boardReducer', () => {
  it('adds a stroke, then appends the points of the same id', () => {
    const s = run(
      EMPTY_BOARD,
      { msg: { t: 'draw', stroke: stroke('t1', 't', [0.1, 0.1]) }, from: teacher },
      { msg: { t: 'draw', stroke: stroke('t1', 't', [0.2, 0.2, 0.3, 0.3]) }, from: teacher },
    );
    expect(s.strokes).toHaveLength(1);
    expect(s.strokes[0]?.pts).toEqual([0.1, 0.1, 0.2, 0.2, 0.3, 0.3]);
  });

  it('refuses a guest stroke until the teacher allows it, and a stroke signed by someone else', () => {
    const msg = { t: 'draw', stroke: stroke('g1', 'g') } as const;
    expect(run(EMPTY_BOARD, { msg, from: guest }).strokes).toHaveLength(0);
    const allowed = run(EMPTY_BOARD, { msg: { t: 'perm', studentsCanDraw: true }, from: teacher }, { msg, from: guest });
    expect(allowed.strokes).toHaveLength(1);
    expect(run(EMPTY_BOARD, { msg: { t: 'draw', stroke: stroke('x', 'g') }, from: teacher }).strokes).toHaveLength(0);
    const hijack = run(allowed, { msg: { t: 'draw', stroke: { ...stroke('g1', 't'), pts: [0.9, 0.9] } }, from: teacher });
    expect(hijack.strokes[0]?.pts).toEqual([0.1, 0.1]);
  });

  it('undo removes only the sender’s own stroke', () => {
    const s = run(EMPTY_BOARD, { msg: { t: 'draw', stroke: stroke('t1', 't') }, from: teacher });
    expect(run(s, { msg: { t: 'undo', id: 't1' }, from: assistant })).toBe(s);
    expect(run(s, { msg: { t: 'undo', id: 't1' }, from: teacher }).strokes).toEqual([]);
  });

  it('clear and open belong to the staff; allowing students to the teacher or admin', () => {
    const s = run(EMPTY_BOARD, { msg: { t: 'draw', stroke: stroke('t1', 't') }, from: teacher });
    expect(run(s, { msg: { t: 'clear' }, from: guest }).strokes).toHaveLength(1);
    expect(run(s, { msg: { t: 'clear' }, from: assistant }).strokes).toHaveLength(0);
    expect(run(s, { msg: { t: 'open', open: true }, from: guest }).open).toBe(false);
    expect(run(s, { msg: { t: 'open', open: true }, from: assistant }).open).toBe(true);
    expect(run(s, { msg: { t: 'perm', studentsCanDraw: true }, from: assistant }).studentsCanDraw).toBe(false);
    expect(run(s, { msg: { t: 'perm', studentsCanDraw: true }, from: { identity: 'x', role: 'admin' } }).studentsCanDraw).toBe(true);
  });

  it('sync merges by id (longer copy wins, idempotent); flags only from the staff', () => {
    const mine = run(EMPTY_BOARD, { msg: { t: 'draw', stroke: stroke('t1', 't', [0.1, 0.1]) }, from: teacher });
    const strokes = [stroke('t1', 't', [0.1, 0.1, 0.2, 0.2]), stroke('a1', 'a')];
    const msg: BoardMessage = { t: 'sync', strokes, studentsCanDraw: true, open: true, allowed: ['g'] };
    const once = run(mine, { msg, from: teacher });
    expect(once.strokes.map((x) => [x.id, x.pts.length])).toEqual([['t1', 4], ['a1', 2]]);
    expect(once).toMatchObject({ studentsCanDraw: true, open: true, allowed: ['g'] });
    expect(run(once, { msg, from: teacher }).strokes).toHaveLength(2);
    const fromGuest = run(EMPTY_BOARD, { msg, from: guest });
    expect(fromGuest).toMatchObject({ studentsCanDraw: false, open: false, allowed: [] });
    expect(fromGuest.strokes).toHaveLength(2);
    expect(run(EMPTY_BOARD, { msg, from: { identity: 'z', role: null } })).toBe(EMPTY_BOARD);
  });

  it('«سماح» lets one guest draw; «إيقاف كتابة» takes it back; only the staff decide', () => {
    const msg = { t: 'draw', stroke: stroke('g1', 'g') } as const;
    const allow = (allowed: boolean, by: BoardInput['from']): BoardInput => ({ msg: { t: 'allow', who: 'g', allow: allowed }, from: by });
    expect(run(EMPTY_BOARD, allow(true, guest), { msg, from: guest }).strokes).toHaveLength(0);
    const allowed = run(EMPTY_BOARD, allow(true, assistant), allow(true, teacher));
    expect(allowed.allowed).toEqual(['g']);
    expect(run(allowed, { msg, from: guest }).strokes).toHaveLength(1);
    expect(run(allowed, { msg, from: { identity: 'g2', role: 'guest' } }).strokes).toHaveLength(0);
    const revoked = run(allowed, allow(false, teacher));
    expect(revoked.allowed).toEqual([]);
    expect(run(revoked, { msg, from: guest }).strokes).toHaveLength(0);
  });

  it('ignores sync-request (the hook answers it)', () => {
    expect(run(EMPTY_BOARD, { msg: { t: 'sync-request' }, from: guest })).toBe(EMPTY_BOARD);
  });
});

describe('shouldAnswerSync', () => {
  it('anyone with strokes answers; the staff also for the flags; an empty board stays quiet', () => {
    expect(shouldAnswerSync(EMPTY_BOARD, 'teacher')).toBe(false);
    expect(shouldAnswerSync({ ...EMPTY_BOARD, open: true }, 'teacher')).toBe(true);
    expect(shouldAnswerSync({ ...EMPTY_BOARD, open: true }, 'guest')).toBe(false);
    expect(shouldAnswerSync({ ...EMPTY_BOARD, allowed: ['g'] }, 'assistant')).toBe(true);
    expect(shouldAnswerSync({ ...EMPTY_BOARD, strokes: [stroke('t1', 't')] }, 'guest')).toBe(true);
  });
});
