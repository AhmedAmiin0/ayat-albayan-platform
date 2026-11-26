import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SideFoot } from './SideFoot';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));
const apiFetch = vi.hoisted(() => vi.fn(() => Promise.reject(new Error('offline'))));
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

vi.mock('./LogoutButton', () => ({ LogoutButton: () => <button type="button">out</button> }));
vi.mock('@ab/web-kit/components/shell/LanguageSwitch', () => ({ LanguageSwitch: () => <button type="button">lang</button> }));

// The profile query fails here and the foot still shows the email.
const render = (ui: ReactElement) =>
  rtlRender(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );

describe('SideFoot', () => {
  it('sits below the nav on the sidebar background instead of over it', () => {
    const { container } = render(<SideFoot email="a@b.co" />);
    const cls = container.querySelector('[data-side-foot]')?.className ?? '';
    for (const c of ['shell:shrink-0', 'shell:bg-cover', 'shell:border-t', 'shell:pb-6']) {
      expect(cls).toContain(c);
    }
    expect(cls).not.toContain('sticky');
  });

  it('spans the full sidebar width and keeps its content on the icon edge, symmetric in RTL and LTR', () => {
    const { container } = render(<SideFoot />);
    const cls = container.querySelector('[data-side-foot]')?.className ?? '';
    expect(cls).toContain('shell:-ms-3');
    expect(cls).toContain('shell:-me-3');
    expect(cls).toContain('shell:px-6');
    expect(cls).not.toMatch(/\b(?:pl|pr|ml|mr|left|right)-/);
  });

  it('shows the account (always LTR), the language and sign-out', () => {
    render(<SideFoot email="a@b.co" />);
    expect(screen.getByText('a@b.co').getAttribute('dir')).toBe('ltr');
    for (const name of ['out', 'lang']) expect(screen.getByRole('button', { name })).toBeTruthy();
  });

  it('leaves the theme and time-format switches to the account page, so nothing scrolls sideways', () => {
    render(<SideFoot email="a@b.co" />);
    expect(screen.queryByRole('group')).toBeNull();
  });
});
