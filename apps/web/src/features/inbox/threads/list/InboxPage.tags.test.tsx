import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { InboxPage } from './InboxPage';
import { thread } from '../../testing/inbox-fixture';
import { renderWithClient, routeFetch } from '../../testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));

const family = (name: string, phone: string, tags: object) =>
  thread({ display_name: name, phone_e164: phone, lead_id: null, lead_status: null, guardian_id: `g-${name}`, ...tags });

afterEach(() => apiFetch.mockReset());

describe('list tags show what needs the admin (docs/07 principle 2: saffron = «دورك»)', () => {
  it('«انتهت الباقة» (renew) and «غير مدفوع» in act; «غير مشترك» never clutters a row; a converted lead is not «مشترك»', async () => {
    const items = [
      family('أم ليان', '+966501110001', { badge: 'expired', unpaid: false, subscribed: false }),
      family('أم يوسف', '+966501110002', { badge: 'subscribed', unpaid: true, subscribed: true }),
      family('أم جود', '+966501110003', { badge: 'none', unpaid: false, subscribed: false }),
      thread({ display_name: 'أبو مالك', phone_e164: '+966551234008', lead_status: 'converted' }),
    ];
    routeFetch(apiFetch, [['/threads?', { items, total: items.length, page: 1, pageSize: 30 }]]);
    renderWithClient(<InboxPage search={{ page: 1 }} onSearch={vi.fn()} />);
    const row = async (name: string) => within(await screen.findByRole('link', { name: new RegExp(t.inbox.openThread.replace('{name}', name)) }));
    const toneIn = (r: ReturnType<typeof within>, label: string) => r.getByText(label).closest('[data-tone]')?.getAttribute('data-tone');

    expect(toneIn(await row('أم ليان'), t.inbox.subscription.badge.expired)).toBe('act');
    const yusuf = await row('أم يوسف');
    expect(toneIn(yusuf, t.inbox.subscription.badge.subscribed)).toBe('ok');
    expect(toneIn(yusuf, t.enums.subscriptionStatus.unpaid)).toBe('act');
    expect((await row('أم جود')).queryByText(t.inbox.subscription.badge.none)).toBeNull();
    const malik = await row('أبو مالك');
    expect(malik.queryByText(t.enums.leadStatus.converted)).toBeNull();
    expect(toneIn(malik, t.inbox.convertedLead)).toBe('neutral');
  });
});
