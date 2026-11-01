import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { from, openRoom, sent } from '@/features/teaching/classroom/board/board-fixture';
import { encodeMessage } from '@/features/teaching/classroom/board/model/messages';

const TEACHER = { identity: 't', role: 'teacher' } as const;

describe('ClassroomRoom whiteboard sync', () => {
  afterEach(() => vi.restoreAllMocks());

  it('asks the room for the board once connected', () => {
    const c = openRoom('guest');
    expect(sent(c)).toEqual([{ msg: { t: 'sync-request' }, to: undefined }]);
  });

  it('the teacher opens «السبورة» for everyone', () => {
    const c = openRoom('teacher');
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.toggle }));
    expect(screen.getByRole('img', { name: t.classroom.board.title })).toBeTruthy();
    expect(sent(c).map((x) => x.msg)).toContainEqual({ t: 'open', open: true });
    expect(screen.getByRole('button', { name: t.classroom.board.toggle }).getAttribute('aria-pressed')).toBe('true');
  });

  it('a guest sees the board when the teacher opens it, read-only until allowed to write', () => {
    const c = openRoom('guest');
    act(() => from(c, TEACHER)({ t: 'open', open: true }));
    expect(screen.getByRole('img', { name: t.classroom.board.title })).toBeTruthy();
    expect(screen.getByText(t.classroom.board.readOnly)).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: t.classroom.board.allowStudents })).toBeNull();
    act(() => from(c, TEACHER)({ t: 'perm', studentsCanDraw: true }));
    expect(screen.getByRole('button', { name: t.classroom.board.pen })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.classroom.board.clear })).toBeNull();
  });

  it('a guest can close the board on their own screen only', () => {
    const c = openRoom('guest');
    act(() => from(c, TEACHER)({ t: 'open', open: true }));
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.toggle }));
    expect(screen.queryByRole('img', { name: t.classroom.board.title })).toBeNull();
    expect(sent(c).map((x) => x.msg)).not.toContainEqual({ t: 'open', open: false });
  });

  it('ignores a guest opening the board and packets on other topics', () => {
    const c = openRoom('guest');
    act(() => from(c, { identity: 'g2', role: 'guest' })({ t: 'open', open: true }));
    act(() => c.receive({ bytes: encodeMessage({ t: 'open', open: true }), topic: 'chat', from: TEACHER }));
    expect(screen.queryByRole('img', { name: t.classroom.board.title })).toBeNull();
  });

  it('answers a late joiner’s sync-request to them only, with the board state', () => {
    const c = openRoom('teacher');
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.toggle }));
    act(() => from(c, { identity: 'late', role: 'guest' })({ t: 'sync-request' }));
    expect(sent(c).at(-1)).toEqual({ msg: { t: 'sync', strokes: [], studentsCanDraw: false, open: true, allowed: [] }, to: ['late'] });
  });

  it('a guest with an empty board stays quiet on a sync-request', () => {
    const c = openRoom('guest');
    const before = sent(c).length;
    act(() => from(c, { identity: 'late', role: 'guest' })({ t: 'sync-request' }));
    expect(sent(c)).toHaveLength(before);
  });

  it('the teacher lets the students write', () => {
    const c = openRoom('teacher');
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.toggle }));
    fireEvent.click(screen.getByRole('checkbox', { name: t.classroom.board.allowStudents }));
    expect(sent(c).map((x) => x.msg)).toContainEqual({ t: 'perm', studentsCanDraw: true });
  });
});
