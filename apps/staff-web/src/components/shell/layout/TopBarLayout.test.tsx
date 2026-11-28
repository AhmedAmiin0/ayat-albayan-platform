import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { WideHeader } from './TopBarLayout';

vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
  useNavigate: () => vi.fn(),
}));
vi.mock('@/features/messaging/notifications/NotificationBell/NotificationBell', () => ({
  NotificationBell: () => <button type="button">{t.bell.open}</button>,
}));

const header = (clocks?: boolean) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <WideHeader clocks={clocks ? <p>{t.runningHead.riyadh}</p> : undefined} />
    </QueryClientProvider>,
  );

const tabOrder = () => screen.getAllByRole('button').concat(screen.getAllByRole('link'));
const before = (a: Element, b: Element) =>
  (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe('WideHeader (from 900px)', () => {
  it('puts the compact theme and time switches right before the bell', () => {
    header();
    const bell = screen.getByRole('button', { name: t.bell.open });
    const theme = screen.getByRole('group', { name: t.theme.label });
    const clock = screen.getByRole('group', { name: t.clock.label });
    expect(theme.parentElement).toBe(clock.parentElement);
    expect(theme.parentElement?.nextElementSibling).toBe(bell);
    expect(within(theme).getByRole('button', { name: t.theme.dark }).textContent).toBe('');
    expect(within(clock).getByRole('button', { name: t.clock.h12 }).textContent).toBe(
      t.clock.h12Short,
    );
  });

  it('reaches the switches before the bell with Tab, then the account and logout', () => {
    header();
    const bell = screen.getByRole('button', { name: t.bell.open });
    const dark = screen.getByRole('button', { name: t.theme.dark });
    const h24 = screen.getByRole('button', { name: t.clock.h24 });
    expect(before(dark, h24) && before(h24, bell)).toBe(true);
    expect(before(bell, screen.getByRole('button', { name: t.auth.logout }))).toBe(true);
    expect(tabOrder().every((el) => !el.hasAttribute('tabindex'))).toBe(true);
  });

  it('keeps the clocks before the controls and the switches in one group', () => {
    header(true);
    const riyadh = screen.getByText(t.runningHead.riyadh);
    expect(before(riyadh, screen.getByRole('group', { name: t.theme.label }))).toBe(true);
    expect(screen.getAllByRole('group', { name: t.clock.label })).toHaveLength(1);
  });
});
