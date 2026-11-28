import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { AdminLayout } from './AdminLayout';

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useQuery: () => ({ data: { email: 'a@b.co' } }),
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useRouterState: () => '/admin/students',
}));
vi.mock('@ab/web-kit/auth/me/me', () => ({ meQuery: {} }));
vi.mock('@/components/shell/nav/Crumbs', () => ({ Crumbs: () => null }));
vi.mock('@/components/shell/header/MenuBar', () => ({ MenuBar: () => <header data-menu-bar /> }));
vi.mock('@/components/shell/account/SideFoot', () => ({ SideFoot: () => <div data-side-foot /> }));
vi.mock('@ab/web-kit/components/ui/layout/running-head', () => ({
  RunningHead: ({ end, layout }: { end?: ReactNode; layout?: string }) => (
    <div data-running-head data-layout={layout}>
      {end}
    </div>
  ),
}));
vi.mock('@/features/messaging/notifications/NotificationBell/NotificationBell', () => ({ NotificationBell: () => <button type="button" data-bell /> }));

const nav = (
  <nav>
    <a href="/admin/leads">leads</a>
    <a href="/admin/students" aria-current="page">
      students
    </a>
  </nav>
);

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

describe('AdminLayout sidebar', () => {
  it('keeps the 4px rhythm: no dead gap override, 24 on top, the foot owns the bottom padding', () => {
    const { container } = render(<AdminLayout nav={nav} title="t">x</AdminLayout>);
    const cls = container.querySelector('aside')?.className ?? '';
    expect(cls).not.toContain('shell:gap-y-0');
    expect(cls).not.toMatch(/gap-\[\d+px\]/);
    for (const c of ['shell:gap-y-6', 'shell:pt-6', 'shell:pb-0']) expect(cls).toContain(c);
  });

  it('scrolls only the nav: the logo and the foot stay in view and never cover an item', () => {
    const { container } = render(<AdminLayout nav={nav} title="t">x</AdminLayout>);
    const aside = container.querySelector('aside');
    const scroller = container.querySelector('[data-side-nav]');
    expect(aside?.className).not.toContain('overflow-y-auto');
    for (const c of ['shell:min-h-0', 'shell:flex-1', 'shell:overflow-y-auto']) {
      expect(scroller?.className).toContain(c);
    }
    expect(scroller?.querySelector('nav')).not.toBeNull();
    expect(scroller?.querySelector('[data-side-foot]')).toBeNull();
    expect(scroller?.contains(container.querySelector('aside > a'))).toBe(false);
  });

  it('owner 2026-10-18 «sidebar have horizontal overflow»: the nav scrolls down only, never sideways', () => {
    const { container } = render(<AdminLayout nav={nav} title="t">x</AdminLayout>);
    expect(container.querySelector('aside')?.className).toContain('shell:overflow-x-hidden');
    expect(container.querySelector('[data-side-nav]')?.className).toContain('shell:overflow-x-hidden');
  });

  it('aligns the logo with the icon edge of the items (24px from the sidebar edge)', () => {
    const { container } = render(<AdminLayout nav={nav} title="t">x</AdminLayout>);
    expect(container.querySelector('aside a')?.className).toContain('shell:px-3');
  });

  it('keeps the current section in view in the sidebar nav', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<AdminLayout nav={nav} title="t">x</AdminLayout>);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
  });

  it('below 900px the sidebar is hidden and the compact bar takes over', () => {
    const { container } = render(<AdminLayout nav={nav} title="t">x</AdminLayout>);
    expect(container.querySelector('aside')?.className.split(' ')).toContain('hidden');
    expect(container.querySelector('aside')?.className).toContain('shell:flex');
    expect(container.querySelector('[data-menu-bar]')).not.toBeNull();
  });

  it('puts the bell at the end of the running head (from 640px; the compact bar has its own)', () => {
    const { container } = render(<AdminLayout nav={nav} title="t">x</AdminLayout>);
    expect(container.querySelector('[data-running-head] [data-bell]')).not.toBeNull();
  });

  it('from 900px the compact theme switch sits right before the bell, with no time switch', () => {
    const { container } = render(<AdminLayout nav={nav} title="t">x</AdminLayout>);
    const end = container.querySelector('[data-running-head] [data-head-end]');
    expect(end?.className.split(' ')).toEqual(expect.arrayContaining(['hidden', 'shell:flex']));
    expect(container.querySelector('[data-running-head]')?.getAttribute('data-layout')).toBe('fit');
    const theme = screen.getByRole('group', { name: t.theme.label });
    expect(end?.contains(theme)).toBe(true);
    expect(screen.queryByRole('group', { name: t.clock.label })).toBeNull();
    expect(end?.lastElementChild?.hasAttribute('data-bell')).toBe(true);
    expect(screen.getByRole('button', { name: t.theme.dark }).getAttribute('aria-label')).toBe(t.theme.dark);
  });

  it('tabs through the theme, then the bell', () => {
    const { container } = render(<AdminLayout nav={nav} title="t">x</AdminLayout>);
    const buttons = [...(container.querySelector('[data-head-end]')?.querySelectorAll('button') ?? [])];
    const at = (el: Element) => buttons.indexOf(el as HTMLButtonElement);
    const bell = container.querySelector('[data-bell]');
    expect(bell).not.toBeNull();
    expect(at(screen.getByRole('button', { name: t.theme.light }))).toBe(1);
    expect(at(screen.getByRole('button', { name: t.theme.dark }))).toBe(2);
    expect(buttons.at(-1)).toBe(bell);
    expect(buttons.every((b) => b.tabIndex === 0)).toBe(true);
  });
});
