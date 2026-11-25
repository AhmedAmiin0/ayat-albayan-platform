import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { BookingLeaveGuard } from '@/features/teaching/booking/kept/BookingLeaveGuard';

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

const l = t.booking.leave;
const BOOK = { pathname: '/admin/book' };

afterEach(() => {
  router.status = 'idle';
  vi.clearAllMocks();
});

describe('BookingLeaveGuard (R-SCH-06)', () => {
  it('blocks leaving an unfinished booking for another page, never a move inside /admin/book', () => {
    render(<BookingLeaveGuard unfinished />);
    const block = router.opts?.shouldBlockFn;
    expect(router.opts?.enableBeforeUnload).toBe(true);
    expect(block?.({ current: BOOK, next: { pathname: '/admin/inbox' } })).toBe(true);
    expect(block?.({ current: BOOK, next: BOOK })).toBe(false);
  });

  it('lets a finished or untouched booking go without asking', () => {
    render(<BookingLeaveGuard unfinished={false} />);
    expect(router.opts?.enableBeforeUnload).toBe(false);
    expect(router.opts?.shouldBlockFn({ current: BOOK, next: { pathname: '/admin/inbox' } })).toBe(
      false,
    );
  });

  it('asks first: staying is the default, leaving proceeds', () => {
    router.status = 'blocked';
    render(<BookingLeaveGuard unfinished />);
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
    render(<BookingLeaveGuard unfinished />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
