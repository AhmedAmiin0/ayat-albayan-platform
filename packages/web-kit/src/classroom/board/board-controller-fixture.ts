import { vi } from 'vitest';
import { EMPTY_BOARD } from './model/model';
import type { BoardController } from './use-board';
import type { BoardShare } from './use-board-share';

// Test data only: the board hook's and the board share's results, with spies for every action.

export function fakeBoard(o: Partial<BoardController> = {}): BoardController {
  return {
    state: EMPTY_BOARD,
    visible: true,
    canDraw: false,
    canManage: false,
    canAllow: false,
    tool: 'pen',
    color: 'ink',
    setTool: vi.fn(),
    setColor: vi.fn(),
    pen: { begin: vi.fn(), extend: vi.fn(), end: vi.fn() },
    undo: vi.fn(),
    clear: vi.fn(),
    setStudentsCanDraw: vi.fn(),
    allowDrawer: vi.fn(),
    openForAll: vi.fn(),
    toggleVisible: vi.fn(),
    ...o,
  };
}

export function fakeBoardShare(o: Partial<BoardShare> = {}): BoardShare {
  return { sharing: false, supported: false, toggle: vi.fn(), ...o };
}
