import { useEffect, useRef, type PointerEvent, type RefObject } from 'react';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { paintBoard, tokenColor } from './draw';
import { BOARD_SIZE, normalize } from './model';
import type { BoardController } from './use-board';

interface Props {
  board: BoardController;
  /** Shared with «مشاركة السبورة» (canvas.captureStream). */
  canvasRef: RefObject<HTMLCanvasElement>;
}

const pointOf = (e: PointerEvent<HTMLCanvasElement>) =>
  normalize({ x: e.clientX, y: e.clientY }, e.currentTarget.getBoundingClientRect());

/**
 * The board canvas: a fixed 1600×900 drawing scaled to fit its box at 16:9 (so every screen sees
 * the same picture), repainted on every change. Pointer events cover mouse, pen and touch.
 */
export function Whiteboard({ board, canvasRef }: Props) {
  const drawing = useRef(false);
  const { strokes } = board.state;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintBoard(ctx, strokes, { ...BOARD_SIZE, resolve: tokenColor });
  }, [strokes, canvasRef]);

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!board.canDraw) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    board.pen.begin(...pointOf(e));
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current) board.pen.extend(...pointOf(e));
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    board.pen.end();
  };

  return (
    <div className="grid size-full min-h-0 place-items-center [container-type:size]">
      <canvas
        ref={canvasRef}
        width={BOARD_SIZE.width}
        height={BOARD_SIZE.height}
        role="img"
        aria-label={t.classroom.board.title}
        data-can-draw={board.canDraw}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        className={cn(
          'aspect-video w-[min(100cqw,calc(100cqh*16/9))] touch-none rounded-md border border-rule-strong bg-raised shadow-page',
          board.canDraw ? 'cursor-crosshair' : 'cursor-default',
        )}
      />
    </div>
  );
}
