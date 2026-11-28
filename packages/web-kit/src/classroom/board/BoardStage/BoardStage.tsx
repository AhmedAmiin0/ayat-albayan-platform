import { t } from '@ab/web-kit/lib/i18n/i18n';
import { BoardToolbar } from '@ab/web-kit/classroom/board/BoardToolbar';
import { Whiteboard } from '@ab/web-kit/classroom/board/Whiteboard';
import type { BoardStageProps } from './BoardStage.types';
import { useBoardStage } from './use-board-stage';

export function BoardStage({ board, room, requests }: BoardStageProps) {
  const { canvasRef, share } = useBoardStage({ room });
  return (
    <section
      aria-label={t.classroom.board.title}
      className="flex size-full min-h-56 flex-col gap-2"
    >
      <BoardToolbar board={board} share={share} requests={requests} />
      <div className="min-h-0 flex-1">
        <Whiteboard board={board} canvasRef={canvasRef} />
      </div>
    </section>
  );
}
