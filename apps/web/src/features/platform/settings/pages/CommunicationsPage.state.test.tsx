import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { SETTINGS } from '@/test/settings-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const p = t.settingsPages;

afterEach(() => apiFetch.mockReset());

// D12: before the settings are in, «التواصل» shows bars (no role=status), or the error with «أعد المحاولة».
describe('«التواصل» load state', () => {
  it('a failed load says so inline with «أعد المحاولة», which refetches; no role=status while loading', async () => {
    let fail = true;
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/settings' && fail) throw new Error('down');
      if (path === '/messages/gate') return { open: false, reason: 'switch_off', queued: 0 };
      if (path === '/admin/notifications') return { entries: [], lines: [] };
      return path === '/settings' ? SETTINGS : path === '/config/meta' ? { meta: {} } : [];
    });
    const { renderWithClient } = await import('@/features/messaging/inbox/testing/test-utils');
    const { CommunicationsPage } = await import('./CommunicationsPage');
    renderWithClient(<CommunicationsPage tab="overview" onTab={() => undefined} />);
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect((await screen.findByRole('alert')).textContent).toContain(p.loadError);
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: p.retry }));
    expect(await screen.findByRole('button', { name: t.templates.settings.enableTitle })).toBeTruthy();
  });
});
