import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { MessageLog } from './MessageLog';

// docs/37 NEW 3: the window around a search hit is never pinned to the bottom; the hit is
// scrolled to and flashed; «الانتقال إلى أحدث رسالة» always shows and leaves the window.

const tops = new WeakMap<Element, number>();
const props = ['scrollHeight', 'clientHeight', 'scrollTop'] as const;
const saved = props.map((p) => [p, Object.getOwnPropertyDescriptor(Element.prototype, p)] as const);
const scroll = vi.fn();

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
  Element.prototype.scrollIntoView = scroll;
});
afterAll(() => {
  for (const [p, d] of saved) if (d) Object.defineProperty(Element.prototype, p, d);
});

const A = message({ id: 'a', body: 'الأولى', created_at: '2026-03-03T09:00:00Z' });
const B = message({ id: 'b', body: 'الثانية', created_at: '2026-03-05T09:00:00Z' });
const C = message({ id: 'c', body: 'الثالثة', created_at: '2026-03-05T10:00:00Z' });
const base = {
  phone: PHONE,
  hasMore: false,
  loadingOlder: false,
  onOlder: vi.fn(),
  waitingKeys: new Set<string>(),
  fill: 'phone' as const,
};
const box = () => {
  const el = screen.getByRole('log', { name: t.messages.log }).parentElement;
  if (!el) throw new Error('no log box');
  return el;
};

describe('MessageLog inside an anchored window', () => {
  it('does not pin to the bottom; the hit is scrolled to and flashed', () => {
    const anchor = { id: 'a', onNewest: vi.fn() };
    render(<MessageLog {...base} messages={[A, B]} anchor={anchor} />);
    expect(box().scrollTop).toBe(0);
    expect(document.getElementById('msg-a')?.hasAttribute('data-flash')).toBe(true);
    expect(scroll.mock.contexts.at(-1)).toBe(document.getElementById('msg-a'));
  });

  it('a new row in the window never moves the reader', () => {
    const anchor = { id: 'a', onNewest: vi.fn() };
    const { rerender } = render(<MessageLog {...base} messages={[A, B]} anchor={anchor} />);
    rerender(<MessageLog {...base} messages={[A, B, C]} anchor={anchor} />);
    expect(box().scrollTop).toBe(0);
  });

  it('«الانتقال إلى أحدث رسالة» always shows and leaves; back live, the log pins down', () => {
    const anchor = { id: 'a', onNewest: vi.fn() };
    const { rerender } = render(<MessageLog {...base} messages={[A, B]} anchor={anchor} />);
    fireEvent.click(screen.getByRole('button', { name: t.inbox.jumpLatest }));
    expect(anchor.onNewest).toHaveBeenCalled();
    rerender(<MessageLog {...base} messages={[A, B, C]} />);
    expect(box().scrollTop).toBe(1000);
    expect(screen.queryByRole('button', { name: t.inbox.jumpLatest })).toBeNull();
  });
});
