import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HubLink } from './HubLink';

const navigate = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({ current: null as null | { navigate: typeof navigate } }));
vi.mock('@tanstack/react-router', () => ({ useRouter: () => router.current }));

const HREF = '/admin/settings/communications?tab=templates';

/** After React's handler (document, past the root): records whether it prevented, then stops jsdom navigating. */
function stopNavigation(): boolean[] {
  const seen: boolean[] = [];
  const listener = (e: Event) => {
    seen.push(e.defaultPrevented);
    e.preventDefault();
  };
  document.addEventListener('click', listener);
  cleanups.push(() => document.removeEventListener('click', listener));
  return seen;
}
const cleanups: (() => void)[] = [];

describe('HubLink (a real <a href> that navigates in-app)', () => {
  afterEach(() => {
    cleanups.splice(0).forEach((f) => f());
    navigate.mockReset();
    router.current = null;
  });

  it('a plain click navigates in-app with the whole href', () => {
    router.current = { navigate };
    render(<HubLink href={HREF}>x</HubLink>);
    const link = screen.getByRole('link', { name: 'x' });
    expect(link.getAttribute('href')).toBe(HREF);
    expect(fireEvent.click(link)).toBe(false);
    expect(navigate).toHaveBeenCalledWith({ href: HREF });
  });

  it('ctrl / cmd click keeps the browser behaviour', () => {
    router.current = { navigate };
    render(<HubLink href={HREF}>x</HubLink>);
    const link = screen.getByRole('link');
    stopNavigation();
    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { metaKey: true });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('without a router it is a plain link (no in-app handling)', () => {
    render(<HubLink href={HREF}>x</HubLink>);
    const prevented = stopNavigation();
    fireEvent.click(screen.getByRole('link'));
    expect(prevented).toEqual([false]);
  });
});
