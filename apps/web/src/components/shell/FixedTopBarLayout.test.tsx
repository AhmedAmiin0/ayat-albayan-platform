import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { FixedTopBarLayout } from './FixedTopBarLayout';

const path = vi.hoisted(() => ({ current: '/sales/inbox' }));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/dashboard/link-mock')).Link,
  useRouterState: ({ select }: { select: (s: { resolvedLocation: { pathname: string } }) => string }) =>
    select({ resolvedLocation: { pathname: path.current } }),
  useNavigate: () => vi.fn(),
}));
vi.mock('@/features/auth/me', () => ({ meQuery: { queryKey: ['auth', 'me'], queryFn: async () => null } }));
vi.mock('./MenuBar', () => ({ MenuBar: () => null }));
vi.mock('@/features/notifications/NotificationBell', () => ({
  NotificationBell: () => <button type="button">{t.bell.open}</button>,
}));

function renderAt(pathname: string, wide = false) {
  path.current = pathname;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FixedTopBarLayout topNav={<nav aria-label={t.sales.nav.label} />} bar={{ home: '/sales', title: t.sales.nav.chats }} wide={wide}>
        <p>page</p>
      </FixedTopBarLayout>
    </QueryClientProvider>,
  );
}

const root = (container: HTMLElement) => container.firstElementChild?.className.split(' ') ?? [];
const header = () => screen.getByRole('banner');

beforeEach(() => {
  path.current = '/sales/inbox';
});

describe('FixedTopBarLayout', () => {
  it('on /sales/inbox: full width, the clocks inside the header row from 1340px (before the bell, never wrapping) and the row only below it', () => {
    const { container } = renderAt('/sales/inbox');
    expect(root(container)).toContain('max-w-none');
    expect(root(container)).not.toContain('max-w-[1180px]');
    const all = screen.getAllByText(t.runningHead.riyadh);
    const riyadh = all.filter((el) => header().contains(el));
    expect(riyadh).toHaveLength(1);
    // Below 1340px the inline clocks (ar ~1190px, en ~1324px with the real fonts) would paint under the
    // bell: hidden there, the separate row shows until 1340px; the inline box clips as a guard (round 2 E).
    const inline = riyadh[0]?.closest('.min-h-0');
    const box = inline?.parentElement?.className.split(' ');
    expect(box).toEqual(expect.arrayContaining(['hidden', 'min-[1340px]:block', 'overflow-hidden', 'whitespace-nowrap']));
    expect(box).not.toContain('min-[1100px]:block');
    expect(inline?.className.split(' ')).toContain('whitespace-nowrap');
    const row = all.find((el) => !header().contains(el))?.closest('.min-h-\\[54px\\]')?.parentElement;
    expect(row?.className.split(' ')).toContain('min-[1340px]:hidden');
    expect(row?.className.split(' ')).not.toContain('shell:hidden');
    const bell = screen.getByRole('button', { name: t.bell.open });
    expect((riyadh[0]?.compareDocumentPosition(bell) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The inline copy drops the running head's 54px row height.
    expect(header().querySelector('.min-h-\\[54px\\]')).toBeNull();
  });

  it('the inbox page gets the top-bar inset (no outer margin from 900px)', () => {
    renderAt('/teacher/inbox');
    const page = screen.getByText('page').closest('[data-page-scroll]')?.parentElement;
    expect(page?.className).toContain('shell:m-0');
    expect(page?.className).toContain('shell:px-3');
  });

  it("off the inbox (the teacher's shell): the 1180px cap and the separate running head, none in the header", () => {
    const { container } = renderAt('/teacher/students');
    expect(root(container)).toContain('max-w-[1180px]');
    const riyadh = screen.getAllByText(t.runningHead.riyadh);
    expect(riyadh).toHaveLength(1);
    expect(header().contains(riyadh[0] ?? null)).toBe(false);
    expect(riyadh[0]?.closest('.min-h-\\[54px\\]')).toBeTruthy();
  });

  it("wide (the assistant's shell, owner 2026-10-20): every page gets the chat's width, clocks and frame, phones keep the toast room", () => {
    const { container } = renderAt('/sales/students', true);
    expect(root(container)).toContain('max-w-none');
    expect(root(container)).not.toContain('max-w-[1180px]');
    const riyadh = screen.getAllByText(t.runningHead.riyadh);
    expect(riyadh.filter((el) => header().contains(el))).toHaveLength(1);
    const row = riyadh.find((el) => !header().contains(el))?.closest('.min-h-\\[54px\\]')?.parentElement;
    expect(row?.className.split(' ')).toContain('min-[1340px]:hidden');
    const page = screen.getByText('page').closest('[data-page-scroll]')?.parentElement?.className.split(' ');
    expect(page).toEqual(expect.arrayContaining(['shell:m-0', 'shell:px-3', 'shell:pt-3', 'shell:pb-3', 'max-sm:px-2']));
    expect(page).not.toContain('max-sm:[&>div]:pb-0');
  });
});
