import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouteLeaveGuard } from '@ab/web-kit/components/ui/overlay/leave-guard';

interface BlockOpts {
  shouldBlockFn: (a: { current: { pathname: string }; next: { pathname: string } }) => boolean;
  enableBeforeUnload: boolean;
}
const router = vi.hoisted(() => ({
  opts: null as BlockOpts | null,
  status: 'idle',
  proceed: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({
  useBlocker: (opts: BlockOpts) => {
    router.opts = opts;
    return { status: router.status, proceed: router.proceed, reset: router.reset };
  },
}));

const l = { title: 'Leave?', body: 'Not finished.', stay: 'Stay', leave: 'Leave' };
const BOOK = { pathname: '/admin/book' };

afterEach(() => {
  router.status = 'idle';
  vi.clearAllMocks();
});

describe('RouteLeaveGuard', () => {
  it('blocks leaving for another page while `when`, never a move on the same page', () => {
    render(<RouteLeaveGuard when words={l} />);
    const block = router.opts?.shouldBlockFn;
    expect(router.opts?.enableBeforeUnload).toBe(true);
    expect(block?.({ current: BOOK, next: { pathname: '/admin/inbox' } })).toBe(true);
    expect(block?.({ current: BOOK, next: BOOK })).toBe(false);
  });

  it('lets the page go without asking otherwise', () => {
    render(<RouteLeaveGuard when={false} words={l} />);
    expect(router.opts?.enableBeforeUnload).toBe(false);
    expect(router.opts?.shouldBlockFn({ current: BOOK, next: { pathname: '/admin/inbox' } })).toBe(
      false,
    );
  });

  it('asks first: staying is the default, leaving proceeds', () => {
    router.status = 'blocked';
    render(<RouteLeaveGuard when words={l} />);
    expect(screen.getByRole('dialog', { name: l.title })).toBeTruthy();
    expect(screen.getByText(l.body)).toBeTruthy();
    const stay = screen.getByRole('button', { name: l.stay });
    expect(stay.hasAttribute('data-autofocus')).toBe(true);
    fireEvent.click(stay);
    expect(router.reset).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: l.leave }));
    expect(router.proceed).toHaveBeenCalledOnce();
  });

  it('shows nothing until a leave is blocked', () => {
    render(<RouteLeaveGuard when words={l} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
