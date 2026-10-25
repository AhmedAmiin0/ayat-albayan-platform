import type { ThreadDetail, ThreadPeople } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { t } from '@/lib/i18n/i18n';
import { detail, lead, PHONE, pupil, thread } from './inbox-fixture';
import { renderWithClient, routeFetch } from './test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));

const GUARDIAN = { guardian_id: 'g-1', lead_id: null, lead_status: null, display_name: 'أم سهيلة' } as const;
const FAMILY: ThreadPeople = {
  guardian: { id: 'g-1', name: 'أم سهيلة' },
  lead: null,
  students: [pupil(), pupil({ id: 's-2', name: 'جود', code: 'AB-0184' }, { status: 'expired', lessons_used: 8, lessons_remaining: 0, due_amount: 0 })],
};

function renderThread(page: ThreadDetail) {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', page],
    ['/messaging/templates', []],
    ['/settings', SETTINGS],
    ['/leads?', { items: [lead()], total: 1, page: 1, pageSize: 5 }],
  ]);
  renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
}

/** The tone of the chip whose word is `label` (docs/07 §6). */
const tone = (label: string) => screen.getByText(label).closest('[data-tone]')?.getAttribute('data-tone');

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('subscription in the chat (R-SUB-01)', () => {
  it('a guardian: «مشترك», each child’s package line and money owed, one button per child', async () => {
    renderThread({ ...detail([], GUARDIAN), people: FAMILY });
    const panel = within(await screen.findByRole('complementary', { name: t.inbox.subscription.title }));
    expect(tone(t.inbox.subscription.badge.subscribed)).toBe('ok');
    expect(panel.getByText(`${t.enums.packageSize['8']} — ${t.subscriptions.progress.left.few.replace('{n}', '3')}`)).toBeTruthy();
    expect(panel.getByText(t.inbox.subscription.due.replace('{amount}', '290 ر.س'))).toBeTruthy();
    expect(panel.getByRole('button', { name: `${t.subscriptions.new} — سهيلة` })).toBeTruthy();
    expect(panel.getByRole('button', { name: `${t.inbox.subscription.renew} — جود` })).toBeTruthy();
    expect(screen.queryByRole('link', { name: t.inbox.subscription.subscribe })).toBeNull();
  });

  it('«جدّد الاشتراك» opens the create dialog for that child; saving refreshes the thread', async () => {
    renderThread({ ...detail([], GUARDIAN), people: FAMILY });
    apiSend.mockImplementation(async (_m: string, path: string) =>
      path === '/subscriptions/quote' ? Promise.reject(new Error('no quote in this test')) : { id: 'sub-new' },
    );
    fireEvent.click(await screen.findByRole('button', { name: `${t.inbox.subscription.renew} — جود` }));
    const dialog = within(screen.getByRole('dialog', { name: t.subscriptions.new }));
    expect(dialog.getByText('جود')).toBeTruthy();
    expect(dialog.queryByRole('searchbox')).toBeNull(); // preset: no student picker
    const reads = apiFetch.mock.calls.length;
    fireEvent.click(dialog.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/subscriptions', expect.objectContaining({ studentId: 's-2' })));
    expect(await screen.findByText(t.subscriptions.saved)).toBeTruthy();
    await waitFor(() => expect(apiFetch.mock.calls.length).toBeGreaterThan(reads));
  });

  it('a family whose packages ended: «انتهت الباقة» in the header and on the child (one word), the admin’s turn', async () => {
    const ended = pupil({}, { status: 'expired', lessons_remaining: 0 });
    renderThread({ ...detail([], GUARDIAN), people: { ...FAMILY, students: [ended] } });
    await screen.findByRole('complementary', { name: t.inbox.subscription.title });
    const chips = screen.getAllByText(t.inbox.subscription.badge.expired);
    expect(t.inbox.subscription.badge.expired).toBe(t.enums.subscriptionStatus.expired);
    expect(chips.map((c) => c.closest('[data-tone]')?.getAttribute('data-tone'))).toEqual(['act', 'act']);
  });

  it('a lead: «غير مشترك» and «اشترك» opens the wizard with a regular package', async () => {
    renderThread({ ...detail([]), people: { guardian: null, lead: { id: 'lead-1', status: 'new' }, students: [] } });
    const subscribe = await screen.findByRole('link', { name: t.inbox.subscription.subscribe });
    const search = new URLSearchParams({ leadId: 'lead-1', phone: PHONE, name: 'أم سهيلة', pkg: '8' });
    expect(subscribe.getAttribute('href')).toBe(`/admin/book?${search}`);
    expect(tone(t.inbox.subscription.badge.none)).toBe('neutral');
    expect(screen.queryByRole('complementary', { name: t.inbox.subscription.title })).toBeNull();
  });

  it('a teacher: no subscription chip and no subscribe buttons', async () => {
    const teacher = thread({ lead_id: null, lead_status: null, teacher_id: 't-1', display_name: 'أبرار' });
    renderThread({ ...detail([]), thread: teacher });
    await screen.findByRole('heading', { name: 'أبرار' });
    for (const label of Object.values(t.inbox.subscription.badge)) expect(screen.queryByText(label)).toBeNull();
    expect(screen.queryByRole('button', { name: new RegExp(t.subscriptions.new) })).toBeNull();
    expect(screen.queryByRole('link', { name: t.inbox.subscription.subscribe })).toBeNull();
  });
});
