import type { ShareRequests } from '@ab/web-kit/classroom/share/use-share-requests';
import type { BoardController } from '@ab/web-kit/classroom/board/use-board';
import type { BoardShare } from '@ab/web-kit/classroom/board/use-board-share';

export interface BoardToolbarProps {
  board: BoardController;
  share: BoardShare;
  requests: ShareRequests;
}
