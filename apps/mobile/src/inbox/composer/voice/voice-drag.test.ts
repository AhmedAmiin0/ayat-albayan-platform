import { cancelDistance, dragVerdict, hintOpacity, LOCK_DISTANCE, micShift, towardStart } from './voice-drag';

const W = 400; // cancel line = 140

describe.each([
  ['RTL (Arabic phone): the start is on the right', true, 1],
  ['LTR (English phone): the start is on the left', false, -1],
])('%s', (_name, rtl, start) => {
  it('towardStart is positive toward the start, negative toward the end', () => {
    expect(towardStart(50 * start, rtl)).toBe(50);
    expect(towardStart(-50 * start, rtl)).toBe(-50);
  });

  it('cancels only past the cancel line toward the start', () => {
    expect(dragVerdict({ dx: 141 * start, dy: 0, rtl, width: W })).toBe('cancel');
    expect(dragVerdict({ dx: 139 * start, dy: 0, rtl, width: W })).toBe('none');
    expect(dragVerdict({ dx: -300 * start, dy: 0, rtl, width: W })).toBe('none'); // toward the end
  });

  it('locks on a slide up while near the button, not once half-way to cancel', () => {
    expect(dragVerdict({ dx: 0, dy: -(LOCK_DISTANCE + 1), rtl, width: W })).toBe('lock');
    expect(dragVerdict({ dx: 69 * start, dy: -100, rtl, width: W })).toBe('lock');
    expect(dragVerdict({ dx: 71 * start, dy: -100, rtl, width: W })).toBe('none');
    expect(dragVerdict({ dx: 0, dy: -LOCK_DISTANCE, rtl, width: W })).toBe('none');
    expect(dragVerdict({ dx: 0, dy: 200, rtl, width: W })).toBe('none'); // down
  });

  it('cancel wins over lock', () => {
    expect(dragVerdict({ dx: 200 * start, dy: -200, rtl, width: W })).toBe('cancel');
  });

  it('micShift follows the finger toward the start only, clamped to max', () => {
    expect(micShift(40 * start, rtl, 140)).toBe(40 * start);
    expect(micShift(500 * start, rtl, 140)).toBe(140 * start);
    expect(micShift(-40 * start, rtl, 140)).toBe(0);
  });
});

describe('cancelDistance and hintOpacity', () => {
  it('at least 100 pt, else 35 % of the width', () => {
    expect(cancelDistance(200)).toBe(100);
    expect(cancelDistance(400)).toBe(140);
  });

  it('the hint fades from 1 to 0 toward the cancel line and never leaves 0–1', () => {
    expect(hintOpacity(0, 140)).toBe(1);
    expect(hintOpacity(70, 140)).toBe(0.5);
    expect(hintOpacity(300, 140)).toBe(0);
    expect(hintOpacity(-50, 140)).toBe(1);
  });
});
