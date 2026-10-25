import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ClassroomRoom } from './ClassroomRoom';
import { from, joinAs, openRoom, sent } from './board/board-fixture';
import { fakeClient, tile } from './fake-client';

// Owner, 2026-10-11: a trial lesson's room has no text chat; it says so in one line.
const NOTE = 'المحادثة النصية مغلقة في الحلقات التجريبية.';

const openTrial = (role: 'teacher' | 'guest') => {
  const c = fakeClient({ tiles: [tile({ key: 'me', isLocal: true, role })] });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  render(<ClassroomRoom join={{ ...joinAs(role), chat: false }} make={() => c} />);
  return c;
};

describe('ClassroomRoom in a trial lesson', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the note to the family and the teacher alike', () => {
    expect(t.classroom.chatClosedTrial).toBe(NOTE);
    openTrial('guest');
    expect(screen.getByText(NOTE)).toBeTruthy();
  });

  it('keeps the whiteboard working: the teacher opens it for everyone', () => {
    const c = openTrial('teacher');
    expect(screen.getByText(NOTE)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.toggle }));
    expect(sent(c).map((x) => x.msg)).toContainEqual({ t: 'open', open: true });
  });

  it('a guest still sees the board the teacher opens', () => {
    const c = openTrial('guest');
    act(() => from(c, { identity: 't', role: 'teacher' })({ t: 'open', open: true }));
    expect(screen.getByRole('img', { name: t.classroom.board.title })).toBeTruthy();
  });

  it('any other lesson has no such note', () => {
    openRoom('guest');
    expect(screen.queryByText(NOTE)).toBeNull();
  });
});
