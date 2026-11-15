import { describe, expect, it, vi } from 'vitest';
import { focusOnMount, revealOnMount } from './mount-refs';

describe('mount ref callbacks', () => {
  it('focusOnMount focuses the mounted node', () => {
    const node = document.createElement('p');
    node.tabIndex = -1;
    document.body.append(node);
    focusOnMount(node);
    expect(document.activeElement).toBe(node);
    node.remove();
  });

  it('revealOnMount scrolls the node to the nearest edge, smoothly', () => {
    const node = document.createElement('section');
    const scroll = vi.fn();
    node.scrollIntoView = scroll;
    revealOnMount(node);
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
  });

  it('revealOnMount skips an engine without scrollIntoView (jsdom)', () => {
    expect(() => revealOnMount(document.createElement('section'))).not.toThrow();
  });

  it('both ignore the unmount call (null)', () => {
    expect(() => {
      focusOnMount(null);
      revealOnMount(null);
    }).not.toThrow();
  });
});
