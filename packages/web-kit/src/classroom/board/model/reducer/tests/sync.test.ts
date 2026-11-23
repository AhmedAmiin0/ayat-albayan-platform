import { describe, expect, it } from 'vitest';
import type { BoardMessage } from '@ab/web-kit/classroom/board/model/messages';
import { EMPTY_BOARD, type Stroke } from '@ab/web-kit/classroom/board/model/model';
import { boardReducer, type BoardInput } from '@ab/web-kit/classroom/board/model/reducer/reducer';

// A sync answer carries strokes like a 'draw' does: only someone who may draw adds them. Before,
// a guest without the grant painted the board by answering a sync-request with made-up strokes.
const stroke = (id: string, by: string): Stroke => ({ id, by, color: 'ink', width: 0.004, erase: false, pts: [0.1, 0.1] });
const guest: BoardInput['from'] = { identity: 'g', role: 'guest' };
const strokes = [stroke('g1', 'g'), stroke('t1', 't')];
const msg: BoardMessage = { t: 'sync', strokes, studentsCanDraw: true, open: true, allowed: ['g'] };

describe('sync from a guest', () => {
  it('without the draw grant: dropped, strokes and flags alike', () => {
    expect(boardReducer(EMPTY_BOARD, { msg, from: guest })).toBe(EMPTY_BOARD);
  });

  it('allowed one by one («سماح»): strokes merged, flags still the staff’s', () => {
    const s = boardReducer({ ...EMPTY_BOARD, allowed: ['g'] }, { msg, from: guest });
    expect(s.strokes.map((x) => x.id)).toEqual(['g1']); // its own only: t1 is signed 't'
    expect(s).toMatchObject({ studentsCanDraw: false, open: false });
  });

  it('every student allowed: its own strokes merged, none signed with another identity', () => {
    const s = boardReducer({ ...EMPTY_BOARD, studentsCanDraw: true }, { msg, from: guest });
    expect(s.strokes.map((x) => x.by)).toEqual(['g']);
  });

  it('the staff relay the whole board, whoever drew it', () => {
    const teacher: BoardInput['from'] = { identity: 't', role: 'teacher' };
    expect(boardReducer(EMPTY_BOARD, { msg, from: teacher }).strokes).toHaveLength(2);
  });

  it('another guest who is not the allowed one: dropped', () => {
    const other: BoardInput['from'] = { identity: 'g2', role: 'guest' };
    const state = { ...EMPTY_BOARD, allowed: ['g'] };
    expect(boardReducer(state, { msg, from: other })).toBe(state);
  });
});
