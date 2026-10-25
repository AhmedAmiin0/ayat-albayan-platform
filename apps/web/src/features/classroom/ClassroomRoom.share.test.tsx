import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { openRoom } from './board/board-fixture';
import { fakeClient, tile } from './fake-client';

const track = { kind: 'video', id: 'board-track' } as unknown as MediaStreamTrack;

describe('ClassroomRoom «مشاركة السبورة»', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.captureStream = vi.fn(() => ({ getVideoTracks: () => [track] }) as unknown as MediaStream);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(HTMLCanvasElement.prototype, 'captureStream');
  });

  it('publishes the canvas at 15 fps as the screen share, and stops it', async () => {
    const c = openRoom('teacher');
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.toggle }));
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.shareOn }));
    expect(HTMLCanvasElement.prototype.captureStream).toHaveBeenCalledWith(15);
    expect(c.setBoardTrack).toHaveBeenCalledWith(track);
    fireEvent.click(await screen.findByRole('button', { name: t.classroom.board.shareOff }));
    expect(c.setBoardTrack).toHaveBeenLastCalledWith(null);
  });

  it('closing the board while it is shared stops the share', async () => {
    const c = openRoom('teacher');
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.toggle }));
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.shareOn }));
    await screen.findByRole('button', { name: t.classroom.board.shareOff });
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.toggle }));
    expect(c.setBoardTrack).toHaveBeenLastCalledWith(null);
  });

  it('a guest has no share button; the teacher’s shared board shows as their board', () => {
    const c = openRoom('guest');
    expect(screen.queryByRole('button', { name: t.classroom.board.shareOn })).toBeNull();
    expect(c.setBoardTrack).not.toHaveBeenCalled();
  });

  it('someone’s shared board takes the stage labelled as their board, hidden once my board is open', () => {
    const tiles = [
      tile({ key: 'me', isLocal: true, role: 'guest' }),
      tile({ key: 't', name: 'Teacher', role: 'teacher' }),
      tile({ key: 't:screen', identity: 't', name: 'Teacher', kind: 'screen', isBoard: true, hasVideo: true }),
    ];
    openRoom('guest', fakeClient({ tiles }));
    const label = t.classroom.boardOf.replace('{name}', 'Teacher');
    expect(screen.getByLabelText(label)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.toggle }));
    expect(screen.queryByLabelText(label)).toBeNull();
    expect(screen.getByRole('img', { name: t.classroom.board.title })).toBeTruthy();
  });
});
