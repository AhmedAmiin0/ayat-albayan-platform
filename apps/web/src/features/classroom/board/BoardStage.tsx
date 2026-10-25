import { useRef } from 'react';
import { t } from '@/lib/i18n/i18n';
import type { ShareRequests } from '../share/use-share-requests';
import type { RoomController } from '../room/livekit/use-room';
import { BoardToolbar } from './BoardToolbar';
import type { BoardController } from './use-board';
import { useBoardShare } from './use-board-share';
import { Whiteboard } from './Whiteboard';

/** «السبورة» on the stage: its tools above, the canvas filling the rest at 16:9. */
export function BoardStage({ board, room, requests }: { board: BoardController; room: RoomController; requests: ShareRequests }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const share = useBoardShare(canvasRef, room);
  return (
    <section aria-label={t.classroom.board.title} className="flex size-full min-h-56 flex-col gap-2">
      <BoardToolbar board={board} share={share} requests={requests} />
      <div className="min-h-0 flex-1">
        <Whiteboard board={board} canvasRef={canvasRef} />
      </div>
    </section>
  );
}
