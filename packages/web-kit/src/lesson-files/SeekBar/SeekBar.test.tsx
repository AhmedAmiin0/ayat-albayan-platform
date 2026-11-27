import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { SeekBar } from './SeekBar';

const P = t.audioPlayer;
const captured = new Set<number>();

beforeEach(() => {
  captured.clear();
  const own = { configurable: true, writable: true };
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { ...own, value: (id: number) => captured.add(id) },
    hasPointerCapture: { ...own, value: (id: number) => captured.has(id) },
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 100, y: 0, width: 200, height: 24 }),
  );
});

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture');
  Reflect.deleteProperty(HTMLElement.prototype, 'hasPointerCapture');
  document.documentElement.dir = '';
});

const bar = (position: number, duration: number) => {
  const seek = vi.fn();
  render(<SeekBar position={position} duration={duration} seek={seek} />);
  return { seek, slider: screen.getByRole('slider', { name: P.seek }) };
};

describe('SeekBar', () => {
  it('reads the place and the length as a slider, each time in its own LTR island', () => {
    const { slider } = bar(30, 120);
    expect(slider.getAttribute('aria-valuenow')).toBe('30');
    expect(slider.getAttribute('aria-valuemax')).toBe('120');
    const text = P.position.replace('{at}', '0:30').replace('{total}', '2:00');
    expect(slider.getAttribute('aria-valuetext')).toBe(text);
    expect(screen.getByText('2:00', { selector: 'bdi' }).getAttribute('dir')).toBe('ltr');
  });

  it('with no length yet the total is a dash', () => {
    bar(0, 0);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('Home and End jump to the ends; another key seeks nothing', () => {
    const { seek, slider } = bar(30, 120);
    fireEvent.keyDown(slider, { key: 'Home' });
    fireEvent.keyDown(slider, { key: 'End' });
    fireEvent.keyDown(slider, { key: 'a' });
    expect(seek.mock.calls).toEqual([[0], [120]]);
  });

  it('the arrow keys follow the reading direction', () => {
    document.documentElement.dir = 'rtl';
    const { seek, slider } = bar(30, 120);
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(seek).toHaveBeenCalledWith(40);
  });

  it('a press seeks to the point and a drag follows only while captured', () => {
    const { seek, slider } = bar(0, 120);
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 200 });
    expect(seek).not.toHaveBeenCalled();
    fireEvent.pointerDown(slider, { pointerId: 1, clientX: 150 });
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 200 });
    expect(seek.mock.calls).toEqual([[30], [60]]);
  });
});
