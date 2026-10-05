import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { message } from './inbox-fixture';
import { MessageLog } from './MessageLog';

// jsdom has no layout: give every box a 1000px tall content in a 400px window, and a real scrollTop.
const tops = new WeakMap<Element, number>();
const props = ['scrollHeight', 'clientHeight', 'scrollTop'] as const;
const saved = props.map((p) => [p, Object.getOwnPropertyDescriptor(Element.prototype, p)] as const);

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollHeight', { configurable: true, get: () => 1000 });
  Object.defineProperty(Element.prototype, 'clientHeight', { configurable: true, get: () => 400 });
  Object.defineProperty(Element.prototype, 'scrollTop', {
    configurable: true,
    get(this: Element) {
      return tops.get(this) ?? 0;
    },
    set(this: Element, v: number) {
      tops.set(this, v);
    },
  });
});
afterAll(() => {
  for (const [p, d] of saved) if (d) Object.defineProperty(Element.prototype, p, d);
});

const A = message({ id: 'a', body: 'الأولى', created_at: '2026-10-03T09:00:00Z' });
const B = message({ id: 'b', body: 'الثانية', created_at: '2026-10-05T09:00:00Z' });
const C = message({ id: 'c', body: 'الثالثة', created_at: '2026-10-05T10:00:00Z' });
const base = { hasMore: false, loadingOlder: false, onOlder: vi.fn(), waitingKeys: new Set<string>() };

const box = () => {
  const el = screen.getByRole('log', { name: t.messages.log }).parentElement;
  if (!el) throw new Error('no log box');
  return el;
};

describe('MessageLog: opens at the newest message and stays pinned there', () => {
  it('opens scrolled to the bottom (the newest message)', () => {
    render(<MessageLog {...base} messages={[A, B]} fill="phone" />);
    expect(box().scrollTop).toBe(1000);
  });

  it('a new message keeps a pinned log at the bottom', () => {
    const { rerender } = render(<MessageLog {...base} messages={[A, B]} fill="phone" />);
    const el = box();
    el.scrollTop = 600;
    fireEvent.scroll(el);
    el.scrollTop = 590; // something moved it a little; still "at the bottom"
    rerender(<MessageLog {...base} messages={[A, B, C]} fill="phone" />);
    expect(el.scrollTop).toBe(1000);
  });

  it('after the reader scrolls up, a new message does not pull them down', () => {
    const { rerender } = render(<MessageLog {...base} messages={[A, B]} fill="phone" />);
    const el = box();
    el.scrollTop = 100;
    fireEvent.scroll(el);
    rerender(<MessageLog {...base} messages={[A, B, C]} fill="phone" />);
    expect(el.scrollTop).toBe(100);
  });

  it('phones get a separator per day; the wide layout does not', () => {
    const { unmount } = render(<MessageLog {...base} messages={[A, B, C]} fill="phone" />);
    expect(box().querySelectorAll('li')).toHaveLength(5);
    expect(screen.getAllByRole('listitem')).toHaveLength(3); // the separators are decoration
    expect(box().className).toMatch(/overflow-y-auto/);
    unmount();
    render(<MessageLog {...base} messages={[A, B, C]} />);
    expect(box().querySelectorAll('li')).toHaveLength(3);
  });
});
