import { describe, expect, it } from 'vitest';
import { decodeMessage, encodeMessage, MAX_SYNC_BYTES, syncMessages, type BoardMessage } from './messages';
import { EMPTY_BOARD, type Stroke } from './model';

const stroke = (id: string, n = 2): Stroke => ({
  id,
  by: 'me',
  color: 'lapis',
  width: 0.004,
  erase: false,
  pts: Array.from({ length: n * 2 }, (_, i) => (i % 10) / 10),
});
const raw = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));

describe('board messages', () => {
  it('round-trips every kind', () => {
    const all: BoardMessage[] = [
      { t: 'draw', stroke: stroke('s1') },
      { t: 'undo', id: 's1' },
      { t: 'clear' },
      { t: 'perm', studentsCanDraw: true },
      { t: 'open', open: false },
      { t: 'sync-request' },
      { t: 'sync', strokes: [stroke('s1'), stroke('s2')], studentsCanDraw: false, open: true },
    ];
    for (const msg of all) expect(decodeMessage(encodeMessage(msg))).toEqual(msg);
  });

  it('drops anything malformed instead of throwing', () => {
    expect(decodeMessage(new TextEncoder().encode('{not json'))).toBeNull();
    expect(decodeMessage(raw({ t: 'nope' }))).toBeNull();
    expect(decodeMessage(raw([1, 2]))).toBeNull();
    expect(decodeMessage(raw({ t: 'undo' }))).toBeNull();
    expect(decodeMessage(raw({ t: 'perm', studentsCanDraw: 'yes' }))).toBeNull();
    expect(decodeMessage(raw({ t: 'open' }))).toBeNull();
    expect(decodeMessage(raw({ t: 'draw', stroke: { ...stroke('x'), color: 'pink' } }))).toBeNull();
    expect(decodeMessage(raw({ t: 'draw', stroke: { ...stroke('x'), pts: [0.1, 2] } }))).toBeNull();
    expect(decodeMessage(raw({ t: 'draw', stroke: { ...stroke('x'), pts: [0.1] } }))).toBeNull();
    expect(decodeMessage(raw({ t: 'draw', stroke: { ...stroke('x'), erase: 1 } }))).toBeNull();
    expect(decodeMessage(raw({ t: 'sync', strokes: [{}], studentsCanDraw: false, open: false }))).toBeNull();
    expect(decodeMessage(raw({ t: 'sync', strokes: 'x', studentsCanDraw: false, open: false }))).toBeNull();
  });

  it('an empty board still syncs its flags in one message', () => {
    expect(syncMessages({ ...EMPTY_BOARD, open: true })).toEqual([{ t: 'sync', strokes: [], studentsCanDraw: false, open: true }]);
  });

  it('a busy board is split into packets under the size limit, every stroke once, in order', () => {
    const strokes = Array.from({ length: 60 }, (_, i) => stroke(`s${i}`, 120));
    const msgs = syncMessages({ ...EMPTY_BOARD, strokes, studentsCanDraw: true });
    expect(msgs.length).toBeGreaterThan(1);
    for (const m of msgs) {
      expect(encodeMessage(m).byteLength).toBeLessThan(MAX_SYNC_BYTES + 500);
      expect(m).toMatchObject({ studentsCanDraw: true, open: false });
    }
    const ids = msgs.flatMap((m) => (m.t === 'sync' ? m.strokes.map((s) => s.id) : []));
    expect(ids).toEqual(strokes.map((s) => s.id));
  });
});
