import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { SETTINGS } from '@/test/settings-fixture';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const p = t.settingsPages;

afterEach(() => mockApi.reset('read'));

describe('«التواصل» load state', () => {
  it('a failed load says so inline with «أعد المحاولة», which refetches; no role=status while loading', async () => {
    let fail = true;
    mockApi.onRead(async ({ path }) => {
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
    fireEvent.click(screen.getByRole('button', { name: t.common.retry }));
    expect(
      await screen.findByRole('button', { name: t.templates.settings.enableTitle }),
    ).toBeTruthy();
  });
});
