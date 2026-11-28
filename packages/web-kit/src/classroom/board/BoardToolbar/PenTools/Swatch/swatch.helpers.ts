import type { PenColor } from '@ab/web-kit/classroom/board/model/model';
import type { BoardController } from '@ab/web-kit/classroom/board/use-board';

// Literal classes so Tailwind's scanner sees them: each pen colour is a theme token.
export const SWATCH: Record<PenColor, string> = {
  ink: 'bg-ink',
  lapis: 'bg-lapis',
  cinnabar: 'bg-danger',
  saffron: 'bg-act',
  gold: 'bg-gold',
};

export const isPicked = (board: BoardController, color: PenColor): boolean =>
  board.tool === 'pen' && board.color === color;

export function pickPen(board: BoardController, color: PenColor): void {
  board.setColor(color);
  board.setTool('pen');
}
