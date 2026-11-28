import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { fakeShare } from '@ab/web-kit/classroom/share/share-fixture';
import { fakeBoard, fakeBoardShare } from '@ab/web-kit/classroom/board/board-controller-fixture';
import { BoardToolbar } from './BoardToolbar';

const B = t.classroom.board;
const colorName = (c: keyof typeof B.colors) => B.color.replace('{name}', B.colors[c]);
const button = (name: string) => screen.getByRole('button', { name });

describe('BoardToolbar for someone who may draw', () => {
  it('picks a colour and switches back to the pen', () => {
    const board = fakeBoard({ canDraw: true, tool: 'eraser' });
    render(<BoardToolbar board={board} share={fakeBoardShare()} requests={fakeShare()} />);
    fireEvent.click(button(colorName('lapis')));
    expect(board.setColor).toHaveBeenCalledWith('lapis');
    expect(board.setTool).toHaveBeenCalledWith('pen');
  });

  it('marks the pen colour in use as pressed, and none while erasing', () => {
    const { rerender } = render(
      <BoardToolbar
        board={fakeBoard({ canDraw: true, color: 'gold' })}
        share={fakeBoardShare()}
        requests={fakeShare()}
      />,
    );
    expect(button(colorName('gold')).getAttribute('aria-pressed')).toBe('true');
    expect(button(colorName('ink')).getAttribute('aria-pressed')).toBe('false');
    rerender(
      <BoardToolbar
        board={fakeBoard({ canDraw: true, color: 'gold', tool: 'eraser' })}
        share={fakeBoardShare()}
        requests={fakeShare()}
      />,
    );
    expect(button(colorName('gold')).getAttribute('aria-pressed')).toBe('false');
  });

  it('chooses the pen or the eraser and undoes', () => {
    const board = fakeBoard({ canDraw: true });
    render(<BoardToolbar board={board} share={fakeBoardShare()} requests={fakeShare()} />);
    fireEvent.click(button(B.eraser));
    fireEvent.click(button(B.pen));
    fireEvent.click(button(B.undo));
    expect(board.setTool).toHaveBeenNthCalledWith(1, 'eraser');
    expect(board.setTool).toHaveBeenNthCalledWith(2, 'pen');
    expect(board.undo).toHaveBeenCalledTimes(1);
  });
});

describe('BoardToolbar for someone who may not draw', () => {
  it('says the board is read only, with no pen, and offers to ask', () => {
    const requests = fakeShare({ canRequest: true });
    render(<BoardToolbar board={fakeBoard()} share={fakeBoardShare()} requests={requests} />);
    expect(screen.getByText(B.readOnly)).toBeTruthy();
    expect(screen.queryByRole('button', { name: B.pen })).toBeNull();
    fireEvent.click(button(t.classroom.boardRequest.draw.request));
    expect(requests.request).toHaveBeenCalledWith('draw');
  });
});

describe('BoardToolbar for the staff', () => {
  it('clears the board and lets the students draw', () => {
    const board = fakeBoard({ canDraw: true, canManage: true, canAllow: true });
    render(<BoardToolbar board={board} share={fakeBoardShare()} requests={fakeShare()} />);
    fireEvent.click(button(B.clear));
    fireEvent.click(screen.getByRole('checkbox', { name: B.allowStudents }));
    expect(board.clear).toHaveBeenCalledTimes(1);
    expect(board.setStudentsCanDraw).toHaveBeenCalledWith(true);
  });

  it('hides the students switch from staff who may not allow them', () => {
    render(
      <BoardToolbar
        board={fakeBoard({ canManage: true })}
        share={fakeBoardShare()}
        requests={fakeShare()}
      />,
    );
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('offers the share only where the board can be captured, and stops it while shared', () => {
    const board = fakeBoard({ canManage: true });
    const { rerender } = render(
      <BoardToolbar board={board} share={fakeBoardShare()} requests={fakeShare()} />,
    );
    expect(screen.queryByRole('button', { name: B.shareOn })).toBeNull();
    const share = fakeBoardShare({ supported: true, sharing: true });
    rerender(<BoardToolbar board={board} share={share} requests={fakeShare()} />);
    fireEvent.click(button(B.shareOff));
    expect(share.toggle).toHaveBeenCalledTimes(1);
  });
});
