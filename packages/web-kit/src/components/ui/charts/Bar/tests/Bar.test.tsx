import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Bar, shareOf } from '@ab/web-kit/components/ui/charts/Bar';

describe('shareOf', () => {
  it('is the value over the max, clamped to 0..1', () => {
    expect(shareOf(3, 4)).toBe(0.75);
    expect(shareOf(9, 4)).toBe(1);
    expect(shareOf(-2, 4)).toBe(0);
  });

  it('draws nothing when there is no max', () => {
    expect(shareOf(5, 0)).toBe(0);
    expect(shareOf(5, -1)).toBe(0);
  });
});

describe('Bar', () => {
  it('fills its share in the logical inline size and hides itself from readers', () => {
    const { container } = render(<Bar value={1} max={4} />);
    const bar = container.firstElementChild;
    expect(bar?.getAttribute('aria-hidden')).toBe('true');
    expect(bar?.getAttribute('data-share')).toBe('0.250');
    const fill = container.querySelector<HTMLElement>('[data-bar-fill]');
    expect(fill?.style.inlineSize).toBe('25%');
    expect(fill?.className).toMatch(/bg-ink-3/);
  });

  it('draws an empty track, with no fill, for a zero value', () => {
    const { container } = render(<Bar value={0} max={4} />);
    expect(container.querySelector('[data-bar-fill]')).toBeNull();
  });
});
