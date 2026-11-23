import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { keepInStrip } from './tab-parts';
import { Tabs } from '#/components/ui/layout/tabs/index.ts';

const TABS = [
  { value: 'a', label: 'أ' },
  { value: 'chat', label: 'المحادثة', badge: 3, ariaLabel: 'المحادثة، 3 غير مقروءة' },
];

describe('Tabs badge and followSelected', () => {
  it('an unread badge: the digits hidden, the tab named by its ariaLabel', () => {
    render(<Tabs label="t" tabs={TABS} value="a" onChange={vi.fn()} />);
    const tab = screen.getByRole('tab', { name: 'المحادثة، 3 غير مقروءة' });
    const badge = tab.querySelector('[aria-hidden="true"]');
    expect(badge?.textContent).toBe('3');
    expect(badge?.className).toContain('bg-lapis-fill');
  });

  it('followSelected scrolls the strip, never the page, to the selected tab', () => {
    const scrollBy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', { value: scrollBy, configurable: true });
    render(<Tabs label="t" tabs={TABS} value="chat" onChange={vi.fn()} followSelected />);
    expect(scrollBy).toHaveBeenCalledWith({ left: 0 });
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollBy');
  });

  it('keepInStrip does nothing without a strip that scrolls', () => {
    expect(() => keepInStrip(null)).not.toThrow();
    expect(() => keepInStrip(document.createElement('button'))).not.toThrow();
  });
});
