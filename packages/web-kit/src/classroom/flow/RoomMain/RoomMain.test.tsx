import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RoomLayout } from '@ab/web-kit/classroom/room/livekit/stage';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { tile } from '@ab/web-kit/testing';
import { RoomMain } from './RoomMain';

const slots = { attach: vi.fn(() => () => undefined), actionFor: () => null };
const me = tile({ key: 'me', name: 'Yusuf', isLocal: true });
const teacher = tile({ key: 'teacher', name: 'Fatima' });
const grid: RoomLayout = { mode: 'grid', tiles: [me, teacher] };
const boardStage: RoomLayout = { mode: 'stage', board: true, stage: null, strip: [me] };

const main = (layout: RoomLayout, on: boolean) => (
  <RoomMain
    layout={layout}
    tiles={[me, teacher]}
    slots={slots}
    board={<p>the board</p>}
    waiting={{ on, note: <span>in 5 minutes</span> }}
    wideStrip={false}
  />
);

describe('RoomMain', () => {
  it('shows the waiting stage with the note while it waits, and nothing of the grid', () => {
    render(main(grid, true));
    expect(screen.getByRole('region', { name: t.roomFlow.waiting.title })).toBeTruthy();
    expect(screen.getByText('in 5 minutes')).toBeTruthy();
    expect(screen.queryByRole('region', { name: t.classroom.title })).toBeNull();
  });

  it('splits the cameras evenly when nothing is shared', () => {
    render(main(grid, false));
    expect(screen.getByRole('region', { name: t.classroom.title })).toBeTruthy();
    expect(screen.queryByText('the board')).toBeNull();
  });

  it('puts the board on the stage with the cameras in the strip', () => {
    render(main(boardStage, false));
    expect(screen.getByText('the board')).toBeTruthy();
    expect(screen.getByRole('list', { name: t.classroom.people })).toBeTruthy();
    expect(screen.queryByRole('region', { name: t.roomFlow.waiting.title })).toBeNull();
  });
});
