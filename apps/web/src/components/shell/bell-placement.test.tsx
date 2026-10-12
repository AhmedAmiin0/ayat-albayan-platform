import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { MenuBar } from './MenuBar';
import { WideHeader } from './TopBarLayout';

vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/dashboard/link-mock')).Link,
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: '/teacher' } }),
  useNavigate: () => vi.fn(),
}));
vi.mock('@/features/notifications/NotificationBell', () => ({
  NotificationBell: () => <button type="button">{t.bell.open}</button>,
}));

const show = (ui: ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('where the bell sits', () => {
  it('compact bar (< 900px): just before «القائمة»', () => {
    show(<MenuBar home="/teacher" title={t.nav.menu} />);
    const bell = screen.getByRole('button', { name: t.bell.open });
    const menu = screen.getByRole('button', { name: t.nav.menu });
    expect(bell.nextElementSibling).toBe(menu);
  });

  it('wide header of the top-bar layouts: before language, theme and logout', () => {
    show(<WideHeader />);
    const bell = screen.getByRole('button', { name: t.bell.open });
    expect(follows(bell, screen.getByRole('button', { name: t.auth.logout }))).toBe(true);
    expect(follows(bell, screen.getByRole('group', { name: t.theme.label }))).toBe(true);
  });
});
