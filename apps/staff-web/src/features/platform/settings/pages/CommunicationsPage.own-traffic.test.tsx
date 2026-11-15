import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderCommunications } from './communications-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const h = t.communicationsHub;
afterEach(() => apiFetch.mockReset());

// Owner 2026-10-27: messages between the academy's own numbers are hidden everywhere; the count shows here.
describe('«التواصل» › «نظرة عامة» › «رسائل بين أرقام الأكاديمية»', () => {
  it('the last 7 days’ count from GET /admin/numbers/own-traffic, with what it means', async () => {
    renderCommunications({ apiFetch });
    const region = await screen.findByRole('region', { name: h.ownTrafficTitle });
    expect(await within(region).findByText(h.ownTrafficCount.replace('{n}', '3'))).toBeTruthy();
    expect(within(region).getByText(h.ownTrafficHint)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/admin/numbers/own-traffic');
  });
});
