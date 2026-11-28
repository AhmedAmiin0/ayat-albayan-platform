import { useRef } from 'react';
import { useBoardShare } from '@ab/web-kit/classroom/board/use-board-share';
import type { BoardStageProps } from './BoardStage.types';

export function useBoardStage({ room }: Pick<BoardStageProps, 'room'>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const share = useBoardShare(canvasRef, room);
  return { canvasRef, share };
}
