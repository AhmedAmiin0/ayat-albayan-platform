import { useCallback, useRef } from 'react';
import { ERASER_WIDTH, PEN_WIDTH, strokeId, type PenColor, type Stroke } from './model';
import type { BoardInput } from './reducer';
import type { BoardSend } from './use-board-sync';

export type BoardTool = 'pen' | 'eraser';

export interface PenOptions {
  me: BoardInput['from'];
  send: BoardSend;
  dispatch: (input: BoardInput) => void;
  tool: BoardTool;
  color: PenColor;
}

export interface Pen {
  begin: (x: number, y: number) => void;
  extend: (x: number, y: number) => void;
  end: () => void;
}

/** Points go out in small batches while drawing (same stroke id), the rest on pointer-up. */
const BATCH = 8;

/** Draws locally at once and streams the stroke to the room as it grows. */
export function usePen({ me, send, dispatch, tool, color }: PenOptions): Pen {
  const seq = useRef(0);
  const current = useRef<Stroke | null>(null);
  const pending = useRef<number[]>([]);

  const flush = useCallback(() => {
    const s = current.current;
    if (!s || pending.current.length === 0) return;
    send({ t: 'draw', stroke: { ...s, pts: pending.current } });
    pending.current = [];
  }, [send]);

  const begin = useCallback(
    (x: number, y: number) => {
      seq.current += 1;
      const erase = tool === 'eraser';
      const stroke: Stroke = { id: strokeId(me.identity, seq.current), by: me.identity, color, width: erase ? ERASER_WIDTH : PEN_WIDTH, erase, pts: [x, y] };
      current.current = { ...stroke, pts: [] };
      pending.current = [x, y];
      dispatch({ msg: { t: 'draw', stroke }, from: me });
    },
    [me, tool, color, dispatch],
  );

  const extend = useCallback(
    (x: number, y: number) => {
      const s = current.current;
      if (!s) return;
      pending.current.push(x, y);
      dispatch({ msg: { t: 'draw', stroke: { ...s, pts: [x, y] } }, from: me });
      if (pending.current.length >= BATCH * 2) flush();
    },
    [me, dispatch, flush],
  );

  const end = useCallback(() => {
    flush();
    current.current = null;
  }, [flush]);

  return { begin, extend, end };
}
