import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLink } from './app-link';

const router = vi.hoisted(() => ({ current: undefined as { navigate: ReturnType<typeof vi.fn> } | undefined }));
vi.mock('@tanstack/react-router', () => ({ useRouter: () => router.current }));

const link = () => screen.getByRole('link', { name: 'جدولة' });

describe('AppLink — an in-app link that never reloads the app', () => {
  beforeEach(() => {
    router.current = { navigate: vi.fn() };
  });

  it('a plain click routes client-side and cancels the document load', () => {
    render(<AppLink href="/admin/book">جدولة</AppLink>);
    expect(link().getAttribute('href')).toBe('/admin/book');
    expect(fireEvent.click(link())).toBe(false); // default prevented
    expect(router.current?.navigate).toHaveBeenCalledWith({ href: '/admin/book' });
  });

  it("the caller's onClick runs first (a menu closes itself)", () => {
    const close = vi.fn();
    render(<AppLink href="/admin/book" onClick={close}>جدولة</AppLink>);
    fireEvent.click(link());
    expect(close).toHaveBeenCalledTimes(1);
    expect(router.current?.navigate).toHaveBeenCalledTimes(1);
  });

  it('ctrl / middle click keep the browser (new tab)', () => {
    render(<AppLink href="/admin/book">جدولة</AppLink>);
    expect(fireEvent.click(link(), { ctrlKey: true })).toBe(true);
    expect(fireEvent.click(link(), { button: 1 })).toBe(true);
    expect(router.current?.navigate).not.toHaveBeenCalled();
  });

  it('without a router (unit tests of the cards) it is a plain link', () => {
    router.current = undefined;
    render(<AppLink href="/admin/settings">جدولة</AppLink>);
    expect(fireEvent.click(link())).toBe(true);
  });
});
