import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SideFoot } from './SideFoot';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));
const apiFetch = vi.hoisted(() => vi.fn(() => Promise.reject(new Error('offline'))));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

vi.mock('./LogoutButton', () => ({ LogoutButton: () => <button type="button">out</button> }));
vi.mock('./LanguageSwitch', () => ({ LanguageSwitch: () => <button type="button">lang</button> }));
vi.mock('@/components/ui/layout/theme-toggle', () => ({ ThemeToggle: () => <button type="button">theme</button> }));

// The «حسابي» chip reads ['me','profile']; here it fails, and the foot still shows the email.
const render = (ui: ReactElement) =>
  rtlRender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

describe('SideFoot', () => {
  it('stays pinned to the bottom of the sidebar on its own background (short viewports)', () => {
    const { container } = render(<SideFoot email="a@b.co" />);
    const foot = container.querySelector('[data-side-foot]');
    expect(foot).not.toBeNull();
    for (const c of ['shell:sticky', 'shell:bottom-0', 'shell:bg-cover', 'shell:mt-auto', 'shell:pb-6']) {
      expect(foot?.className).toContain(c);
    }
  });

  it('spans the full sidebar width and keeps its content on the icon edge, symmetric in RTL and LTR', () => {
    const { container } = render(<SideFoot />);
    const cls = container.querySelector('[data-side-foot]')?.className ?? '';
    expect(cls).toContain('shell:-ms-3');
    expect(cls).toContain('shell:-me-3');
    expect(cls).toContain('shell:px-6');
    expect(cls).not.toMatch(/\b(?:pl|pr|ml|mr|left|right)-/);
  });

  it('shows the account (always LTR) and the three controls', () => {
    render(<SideFoot email="a@b.co" />);
    expect(screen.getByText('a@b.co').getAttribute('dir')).toBe('ltr');
    for (const name of ['out', 'lang', 'theme']) expect(screen.getByRole('button', { name })).toBeTruthy();
  });
});
