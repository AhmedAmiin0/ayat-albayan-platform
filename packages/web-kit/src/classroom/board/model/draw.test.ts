import { describe, expect, it } from 'vitest';
import { paintBoard, tokenColor, type CtxLike } from './draw';
import type { Stroke } from './model';

function stubCtx() {
  const calls: string[] = [];
  const ctx: CtxLike = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
    fillRect: (...r: number[]) => void calls.push(`fill ${String(ctx.fillStyle)} ${r.join(',')}`),
    beginPath: () => void calls.push('begin'),
    moveTo: (x, y) => void calls.push(`move ${x},${y}`),
    lineTo: (x, y) => void calls.push(`line ${x},${y}`),
    stroke: () => void calls.push(`stroke ${String(ctx.strokeStyle)} ${ctx.lineWidth}`),
  };
  return { ctx, calls };
}

const resolve = (token: string) => `var(${token})`;
const s = (o: Partial<Stroke>): Stroke => ({ id: 'x', by: 'me', color: 'lapis', width: 0.01, erase: false, pts: [], ...o });

describe('paintBoard', () => {
  it('paints the paper first, then each stroke scaled to the board, round caps', () => {
    const { ctx, calls } = stubCtx();
    paintBoard(ctx, [s({ pts: [0.5, 0.5, 1, 1] })], { width: 200, height: 100, resolve });
    expect(calls).toEqual(['fill var(raised) 0,0,200,100', 'begin', 'move 100,50', 'line 200,100', 'stroke var(lapis) 2']);
    expect(ctx.lineCap).toBe('round');
  });

  it('a tap leaves a dot; the eraser paints with the paper; an empty stroke draws nothing', () => {
    const { ctx, calls } = stubCtx();
    paintBoard(ctx, [s({ pts: [0, 0] }), s({ erase: true, pts: [0, 0, 0.1, 0.1] }), s({ pts: [] })], { width: 100, height: 100, resolve });
    expect(calls).toContain('line 0.01,0');
    expect(calls).toContain('stroke var(raised) 1');
    expect(calls.filter((c) => c === 'begin')).toHaveLength(2);
  });
});

describe('tokenColor', () => {
  it('reads the CSS custom property, with a fallback when unset', () => {
    document.documentElement.style.setProperty('--lapis', '#14503a');
    expect(tokenColor('lapis')).toBe('#14503a');
    expect(tokenColor('gold')).toBe('#000000');
    expect(tokenColor('raised')).toBe('#ffffff');
  });
});
