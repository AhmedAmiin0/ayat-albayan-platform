import { describe, expect, it, vi } from 'vitest';
import { escapeKeeps, focusOnMount } from './reclassify-keys';

const key = (name: string) => ({ key: name, stopPropagation: vi.fn() });

describe('reclassify keys', () => {
  it('Escape keeps the lead and stops the event', () => {
    const onKeep = vi.fn();
    const e = key('Escape');
    escapeKeeps(onKeep)(e);
    expect(onKeep).toHaveBeenCalledOnce();
    expect(e.stopPropagation).toHaveBeenCalledOnce();
  });

  it('another key does nothing', () => {
    const onKeep = vi.fn();
    const e = key('Enter');
    escapeKeeps(onKeep)(e);
    expect(onKeep).not.toHaveBeenCalled();
    expect(e.stopPropagation).not.toHaveBeenCalled();
  });

  it('focuses the element it is attached to and ignores a detach', () => {
    const el = document.createElement('button');
    document.body.append(el);
    focusOnMount(el);
    expect(document.activeElement).toBe(el);
    expect(() => focusOnMount(null)).not.toThrow();
    el.remove();
  });
});
