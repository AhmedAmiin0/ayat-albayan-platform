import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminLayout } from './AdminLayout';

vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: { email: 'a@b.co' } }) }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useRouterState: () => '/admin/students',
}));
vi.mock('@/features/auth/me', () => ({ meQuery: {} }));
vi.mock('./Crumbs', () => ({ Crumbs: () => null }));
vi.mock('./SideFoot', () => ({ SideFoot: () => <div data-side-foot /> }));
vi.mock('@/components/ui/running-head', () => ({ RunningHead: () => null }));

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
    const { container } = render(<AdminLayout nav={nav}>x</AdminLayout>);
    const aside = container.querySelector('aside');
    const cls = aside?.className ?? '';
    expect(cls).not.toContain('shell:gap-y-0');
    expect(cls).not.toMatch(/gap-\[\d+px\]/);
    for (const c of ['shell:gap-y-6', 'shell:pt-6', 'shell:pb-0', 'shell:overflow-y-auto']) expect(cls).toContain(c);
  });

  it('aligns the logo with the icon edge of the items (24px from the sidebar edge)', () => {
    const { container } = render(<AdminLayout nav={nav}>x</AdminLayout>);
    expect(container.querySelector('aside a')?.className).toContain('shell:px-3');
  });

  it('centres the current section in the compact strip', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<AdminLayout nav={nav}>x</AdminLayout>);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'center' });
  });
});
