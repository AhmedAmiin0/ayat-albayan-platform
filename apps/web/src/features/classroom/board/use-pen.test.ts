import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BoardMessage } from './messages';
import { ERASER_WIDTH, PEN_WIDTH } from './model';
import type { BoardInput } from './reducer';
import { usePen, type BoardTool } from './use-pen';

const me = { identity: 'me', role: 'teacher' } as const;

function setup(tool: BoardTool = 'pen') {
  const send = vi.fn<(msg: BoardMessage) => void>();
  const dispatch = vi.fn<(input: BoardInput) => void>();
  const { result } = renderHook(() => usePen({ me, send, dispatch, tool, color: 'gold' }));
  return { pen: result.current, send, dispatch };
}

const pts = (m: BoardMessage | undefined) => (m?.t === 'draw' ? m.stroke.pts : []);

describe('usePen', () => {
  it('draws locally at once and sends the stroke on pointer-up', () => {
    const { pen, send, dispatch } = setup();
    pen.begin(0.1, 0.2);
    pen.extend(0.3, 0.4);
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(send).not.toHaveBeenCalled();
    pen.end();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toMatchObject({ t: 'draw', stroke: { by: 'me', color: 'gold', width: PEN_WIDTH, erase: false, pts: [0.1, 0.2, 0.3, 0.4] } });
  });

  it('streams long strokes in batches under the same id, nothing lost', () => {
    const { pen, send } = setup();
    pen.begin(0, 0);
    for (let i = 1; i <= 20; i += 1) pen.extend(i / 100, i / 100);
    pen.end();
    const msgs = send.mock.calls.map((c) => c[0]);
    expect(msgs.length).toBeGreaterThan(1);
    expect(new Set(msgs.map((m) => (m.t === 'draw' ? m.stroke.id : '')))).toHaveProperty('size', 1);
    expect(msgs.flatMap(pts)).toHaveLength(42);
  });

  it('the eraser makes wide erase strokes; moves without a stroke do nothing', () => {
    const { pen, send, dispatch } = setup('eraser');
    pen.extend(0.5, 0.5);
    pen.end();
    expect(dispatch).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    pen.begin(0.5, 0.5);
    pen.end();
    expect(send.mock.calls[0]?.[0]).toMatchObject({ stroke: { erase: true, width: ERASER_WIDTH } });
  });
});
