import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message, PHONE } from './inbox-fixture';
import { MessageLog } from './MessageLog';
import { clearOwnSends, recordOwnSend } from './own-send';

// jsdom has no layout: every box holds 1000px of content in a 400px window, with a real scrollTop.
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
afterEach(clearOwnSends);

const A = message({ id: 'a', body: 'الأولى', created_at: '2026-10-05T09:00:00Z' });
const B = message({ id: 'b', body: 'الثانية', created_at: '2026-10-05T09:05:00Z' });
const C = message({ id: 'c', body: 'الثالثة', created_at: '2026-10-05T09:10:00Z' });
const D = message({ id: 'd', body: 'الرابعة', created_at: '2026-10-05T09:15:00Z' });
// The send waits for a sender pass: her row comes back 'sent', not 'queued'.
const MINE = message({ id: 'mine', direction: 'outbound', status: 'sent', body: 'ردّي', created_at: '2026-10-05T09:20:00Z' });
const base = { phone: PHONE, hasMore: false, loadingOlder: false, onOlder: vi.fn(), waitingKeys: new Set<string>() };

const box = () => {
  const el = screen.getByRole('log', { name: t.messages.log }).parentElement;
  if (!el) throw new Error('no log box');
  return el;
};
const jump = () => screen.queryByRole('button', { name: (name) => name.startsWith(t.inbox.jumpLatest) });

/** Renders A, B and scrolls the reader up into the history. */
function scrolledUp() {
  const view = render(<MessageLog {...base} messages={[A, B]} />);
  const el = box();
  el.scrollTop = 100;
  fireEvent.scroll(el);
  return { ...view, el };
}

describe('MessageLog: jump to the latest message (W4)', () => {
  it('pinned at the bottom: no button', () => {
    render(<MessageLog {...base} messages={[A, B]} />);
    expect(box().scrollTop).toBe(1000);
    expect(jump()).toBeNull();
  });

  it('scrolled up: the button shows, with no count until something new arrives', () => {
    scrolledUp();
    expect(jump()?.textContent).toBe('');
  });

  it('a new inbound message while away → «1»; click → the bottom, and the button is gone', () => {
    const { el, rerender } = scrolledUp();
    rerender(<MessageLog {...base} messages={[A, B, C]} />);
    expect(el.scrollTop).toBe(100); // not pulled down
    expect(jump()?.textContent).toBe('1');
    rerender(<MessageLog {...base} messages={[A, B, C, D]} />);
    expect(jump()?.textContent).toBe('2');
    const button = jump();
    if (!button) throw new Error('no jump button');
    fireEvent.click(button);
    expect(el.scrollTop).toBe(el.scrollHeight);
    expect(jump()).toBeNull();
    // Pinned again: the next message keeps her at the bottom with no button.
    el.scrollTop = 590;
    rerender(<MessageLog {...base} messages={[A, B, C, D, MINE]} />);
    expect(el.scrollTop).toBe(1000);
    expect(jump()).toBeNull();
  });

  it('her own send (the id her composer recorded, already sent) snaps to the bottom while away, without the button', () => {
    const { el, rerender } = scrolledUp();
    recordOwnSend(PHONE, 'mine');
    rerender(<MessageLog {...base} messages={[A, B, MINE]} />);
    expect(el.scrollTop).toBe(1000);
    expect(jump()).toBeNull();
  });

  it('her row polled in before the send answered: it snaps once the id is recorded', () => {
    const { el, rerender } = scrolledUp();
    rerender(<MessageLog {...base} messages={[A, B, MINE]} />);
    expect(el.scrollTop).toBe(100);
    recordOwnSend(PHONE, 'mine');
    rerender(<MessageLog {...base} messages={[A, B, { ...MINE }]} />);
    expect(el.scrollTop).toBe(1000);
    expect(jump()).toBeNull();
  });

  it('a colleague’s (or an automatic) queued row does not move her; the count says it arrived', () => {
    const { el, rerender } = scrolledUp();
    const theirs = message({ id: 'theirs', direction: 'outbound', status: 'queued', created_at: '2026-10-05T09:30:00Z' });
    rerender(<MessageLog {...base} messages={[A, B, theirs]} />);
    expect(el.scrollTop).toBe(100);
    expect(jump()?.textContent).toBe('1');
    expect(jump()?.getAttribute('aria-label')).toBe(t.inbox.jumpLatestCount.replace('{count}', '1'));
  });

  it('her send in another chat does not move this one', () => {
    const { el, rerender } = scrolledUp();
    recordOwnSend('+966507654321', 'mine');
    rerender(<MessageLog {...base} messages={[A, B, MINE]} />);
    expect(el.scrollTop).toBe(100);
  });

  it('scrolling back down by hand hides the button', () => {
    const { el, rerender } = scrolledUp();
    rerender(<MessageLog {...base} messages={[A, B, C]} />);
    el.scrollTop = 600;
    fireEvent.scroll(el);
    expect(jump()).toBeNull();
  });
});
