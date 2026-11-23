import { describe, expect, it } from 'vitest';
import { followSelected, placeIndicator } from './slide-indicator';

const box = (rect: { left: number; top: number; width: number; height: number }) => {
  const el = document.createElement('a');
  Object.defineProperties(el, {
    offsetLeft: { value: rect.left },
    offsetTop: { value: rect.top },
    offsetWidth: { value: rect.width },
    offsetHeight: { value: rect.height },
  });
  return el;
};

describe('placeIndicator', () => {
  it('covers the target: its size and a transform to its offset', () => {
    const bar = document.createElement('span');
    bar.hidden = true;
    placeIndicator(bar, box({ left: 80, top: 4, width: 72, height: 56 }));
    expect(bar.style.transform).toBe('translate(80px, 4px)');
    expect([bar.style.width, bar.style.height, bar.hidden]).toEqual(['72px', '56px', false]);
  });

  it('slides only after the first placement (no slide in from the corner on load)', async () => {
    const bar = document.createElement('span');
    placeIndicator(bar, box({ left: 0, top: 0, width: 10, height: 10 }));
    await new Promise((done) => setTimeout(done, 40));
    expect(bar.dataset.placed).toBe('');
  });
});

describe('followSelected', () => {
  it('moves the host’s indicator onto the selected choice', () => {
    document.body.innerHTML =
      '<ul data-indicator-host><span data-indicator hidden></span><li><a>x</a></li></ul>';
    const link = document.querySelector('a');
    followSelected(link);
    expect(document.querySelector<HTMLElement>('[data-indicator]')?.hidden).toBe(false);
  });

  it('does nothing without a host (or when the choice unmounts)', () => {
    expect(followSelected(null)).toBeUndefined();
    expect(followSelected(document.createElement('a'))).toBeUndefined();
  });
});
