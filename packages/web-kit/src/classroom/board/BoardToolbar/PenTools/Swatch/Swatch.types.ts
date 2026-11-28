import type { PenColor } from '@ab/web-kit/classroom/board/model/model';
import type { BoardController } from '@ab/web-kit/classroom/board/use-board';

export interface SwatchProps {
  color: PenColor;
  board: BoardController;
}
