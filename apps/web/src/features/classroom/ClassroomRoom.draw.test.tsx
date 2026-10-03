import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { openRoom, sent } from './board/board-fixture';

function canvas() {
  const el = screen.getByRole('img', { name: t.classroom.board.title });
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 400, height: 225 } as DOMRect);
  return el;
}

function drawLine(el: HTMLElement) {
  fireEvent.pointerDown(el, { clientX: 100, clientY: 45, pointerId: 1 });
  fireEvent.pointerMove(el, { clientX: 200, clientY: 90, pointerId: 1 });
  fireEvent.pointerUp(el, { pointerId: 1 });
}

describe('ClassroomRoom whiteboard drawing', () => {
  afterEach(() => vi.restoreAllMocks());

  it('the teacher draws: the stroke goes out normalised, with their identity and colour', () => {
    const c = openRoom('teacher');
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.toggle }));
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.color.replace('{name}', t.classroom.board.colors.cinnabar) }));
    drawLine(canvas());
    const draws = sent(c).filter((x) => x.msg?.t === 'draw');
    expect(draws).toHaveLength(1);
    expect(draws[0]?.msg).toMatchObject({ t: 'draw', stroke: { by: 'me', color: 'cinnabar', erase: false, pts: [0.25, 0.2, 0.5, 0.4] } });
  });

  it('the eraser draws erase strokes, and «تراجع» undoes the last own stroke', () => {
    const c = openRoom('admin');
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.toggle }));
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.eraser }));
    drawLine(canvas());
    const draw = sent(c).find((x) => x.msg?.t === 'draw')?.msg;
    expect(draw).toMatchObject({ stroke: { erase: true } });
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.undo }));
    const id = draw?.t === 'draw' ? draw.stroke.id : '';
    expect(sent(c).at(-1)?.msg).toEqual({ t: 'undo', id });
  });

  it('«مسح السبورة» clears for everyone', () => {
    const c = openRoom('assistant');
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.toggle }));
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.clear }));
    expect(sent(c).at(-1)?.msg).toEqual({ t: 'clear' });
  });

  it('a guest without permission cannot draw', () => {
    const c = openRoom('guest');
    fireEvent.click(screen.getByRole('button', { name: t.classroom.board.toggle }));
    drawLine(canvas());
    expect(sent(c).filter((x) => x.msg?.t === 'draw')).toEqual([]);
  });
});
