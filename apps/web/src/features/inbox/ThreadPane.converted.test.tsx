import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { t } from '@/lib/i18n';
import { detail, lead, PHONE } from './inbox-fixture';
import { renderWithClient, routeFetch } from './test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));

function renderLead(status: 'converted' | 'lost') {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', { ...detail([], { lead_status: status }), people: { guardian: null, lead: { id: 'lead-1', status }, students: [] } }],
    ['/messaging/templates', []],
    ['/settings', SETTINGS],
    ['/leads?', { items: [lead({ status })], total: 1, page: 1, pageSize: 5 }],
  ]);
  renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
}

afterEach(() => apiFetch.mockReset());

describe('a converted lead with no family on this number (design review: «مشترك» next to «غير مشترك»)', () => {
  it('reads «تحوّل إلى طالب» (neutral), no «مشترك» / «غير مشترك», and can still subscribe; no trial', async () => {
    renderLead('converted');
    const chip = await screen.findByText(t.inbox.convertedLead);
    expect(chip.closest('[data-tone]')?.getAttribute('data-tone')).toBe('neutral');
    expect(screen.queryByText(t.inbox.subscription.badge.subscribed)).toBeNull();
    expect(screen.queryByText(t.inbox.subscription.badge.none)).toBeNull();
    expect(await screen.findByRole('link', { name: t.inbox.subscription.subscribe })).toBeTruthy();
    expect(screen.queryByRole('link', { name: t.booking.trialTitle })).toBeNull();
  });

  it('a lost lead: «غير مشترك», and neither the trial nor «اشترك» (same as mobile)', async () => {
    renderLead('lost');
    expect(await screen.findByText(t.inbox.subscription.badge.none)).toBeTruthy();
    await screen.findByRole('button', { name: new RegExp(t.leads.reclassifyAsApplicant) });
    expect(screen.queryByRole('link', { name: t.inbox.subscription.subscribe })).toBeNull();
  });
});
