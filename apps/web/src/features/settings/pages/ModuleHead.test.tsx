import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ModuleHead } from './ModuleHead';

vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/inbox/testing/test-utils')).MockLink,
}));

describe('ModuleHead (a module page under /admin/settings)', () => {
  it('«الإعدادات › title»: the link back to the hub, the current page, one h1 and what sits beside it', () => {
    render(
      <ModuleHead title={t.integrations.title}>
        <span>beside</span>
      </ModuleHead>,
    );
    const crumbs = screen.getByRole('navigation', { name: t.settingsPages.crumbs });
    const back = within(crumbs).getByRole('link', { name: t.settings.title });
    expect(back.getAttribute('href')).toMatch(/^\/admin\/settings\??$/);
    expect(within(crumbs).getByText(t.integrations.title).getAttribute('aria-current')).toBe('page');
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([t.integrations.title]);
    expect(screen.getByText('beside')).toBeTruthy();
  });
});
