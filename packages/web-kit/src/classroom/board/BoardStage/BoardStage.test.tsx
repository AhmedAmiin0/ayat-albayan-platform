import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { fakeRoom, fakeShare } from '@ab/web-kit/classroom/share/share-fixture';
import { fakeBoard } from '@ab/web-kit/classroom/board/board-controller-fixture';
import { BoardStage } from './BoardStage';

const B = t.classroom.board;

describe('BoardStage', () => {
  it('shows the tools over the canvas in one labelled region', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const board = fakeBoard({ canDraw: true });
    render(<BoardStage board={board} room={fakeRoom()} requests={fakeShare()} />);
    const region = screen.getByRole('region', { name: B.title });
    expect(region.querySelector('canvas')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: B.undo }));
    expect(board.undo).toHaveBeenCalledTimes(1);
  });

  it('offers no share where the canvas cannot be captured', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(
      <BoardStage
        board={fakeBoard({ canManage: true })}
        room={fakeRoom()}
        requests={fakeShare()}
      />,
    );
    expect(screen.queryByRole('button', { name: B.shareOn })).toBeNull();
  });
});
