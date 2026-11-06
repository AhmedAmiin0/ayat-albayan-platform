import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { InboxPage } from './InboxPage';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

// Invented families (owner 2026-11-06: no tags; a green ring subscribed, a gray one renewal due).
const family = (name: string, phone: string, tags: object) =>
  thread({ display_name: name, phone_e164: phone, lead_id: null, lead_status: null, guardian_id: `g-${name}`, ...tags });

const ITEMS = [
  family('أم ليان', '+966501110001', { badge: 'expired', unpaid: false, subscribed: false, ring: 'renewal' }),
  family('أم يوسف', '+966501110002', { badge: 'subscribed', unpaid: true, subscribed: true, ring: 'subscribed' }),
  family('أم جود', '+966501110003', { badge: 'none', unpaid: false, subscribed: false, ring: null }),
  thread({ display_name: 'أبو مالك', phone_e164: '+966551234008', lead_status: 'converted' }),
];

/** Every word a row once carried as a tag or chip. */
const TAG_WORDS = () => [
  t.inbox.subscription.badge.expired,
  t.inbox.subscription.badge.subscribed,
  t.inbox.subscription.badge.none,
  t.enums.subscriptionStatus.unpaid,
  t.enums.leadStatus.converted,
  t.enums.leadSource.facebook_ad,
  t.inbox.convertedLead,
  t.inbox.kind.guardian,
  t.inbox.kind.lead,
];

const link = (name: string) =>
  screen.findByRole('link', { name: new RegExp(t.inbox.openThread.replace('{name}', name)) });
const ringOf = async (name: string) =>
  (await link(name)).querySelector('[data-ring]')?.getAttribute('data-ring');

afterEach(() => apiFetch.mockReset());

describe('chat list rows: no tags, the family state is the avatar ring', () => {
  it('no row carries a status, source, role, package or money chip', async () => {
    routeFetch(apiFetch, [['/threads?', { items: ITEMS, total: ITEMS.length, page: 1, pageSize: 30 }]]);
    renderWithClient(<InboxPage search={{ page: 1 }} onSearch={vi.fn()} />);
    for (const name of ['أم ليان', 'أم يوسف', 'أم جود', 'أبو مالك']) {
      const row = within(await link(name));
      for (const word of TAG_WORDS()) expect(row.queryByText(word)).toBeNull();
    }
  });

  it('green ring subscribed, gray ring renewal, none otherwise; the label says it', async () => {
    routeFetch(apiFetch, [['/threads?', { items: ITEMS, total: ITEMS.length, page: 1, pageSize: 30 }]]);
    renderWithClient(<InboxPage search={{ page: 1 }} onSearch={vi.fn()} />);
    expect(await ringOf('أم يوسف')).toBe('subscribed');
    expect((await link('أم يوسف')).querySelector('[data-ring]')?.className).toContain('border-ok');
    expect(await ringOf('أم ليان')).toBe('renewal');
    expect((await link('أم ليان')).querySelector('[data-ring]')?.className).toContain('border-rule-input');
    expect(await ringOf('أم جود')).toBe('none');
    expect(await ringOf('أبو مالك')).toBe('none');
    expect((await link('أم يوسف')).getAttribute('aria-label')).toContain(t.inbox.ring.subscribed);
    expect((await link('أم ليان')).getAttribute('aria-label')).toContain(t.inbox.ring.renewal);
    expect((await link('أم جود')).getAttribute('aria-label')).not.toContain(t.inbox.ring.renewal);
  });
});
