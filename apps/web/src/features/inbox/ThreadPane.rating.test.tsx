import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { detail, message, PHONE, template } from './testing/inbox-fixture';
import { renderWithClient, routeFetch } from './testing/test-utils';
import { ThreadPane } from './ThreadPane';

// The 24 h window in the header, «إرسال تقييم الحلقة» in a closed chat, the rating chip (migration 195).

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./testing/test-utils')).MockLink }));

const PATH = '/threads/%2B966501234567';
const HOUR = 3_600_000;
const RATING = template({ key: 'lesson_rating', params: ['student_name', 'lesson_date'] });
const tap = message({
  id: 'm-tap',
  body: 'جيدة',
  interactive_payload: { type: 'button', button: { text: 'جيدة', payload: 'rate_good:l-1' } },
});

function renderThread(input: { lastInboundAgoMs: number; templates?: unknown[]; guardian?: boolean }) {
  const last = new Date(Date.now() - input.lastInboundAgoMs).toISOString();
  const open = input.lastInboundAgoMs < 24 * HOUR;
  routeFetch(apiFetch, [
    [PATH, detail([tap], { session_open: open, last_inbound_at: last, guardian_id: input.guardian === false ? null : 'g-1' })],
    ['/messaging/templates', input.templates ?? [template(), RATING]],
    ['/messages/gate', { open: true, reason: null, queued: 0 }],
    ['/settings', SETTINGS],
    ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
  ]);
  renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('thread header: the 24 h window', () => {
  it('open: «المحادثة مفتوحة — تبقّى 21س», no rating button', async () => {
    renderThread({ lastInboundAgoMs: 3 * HOUR - 60_000 });
    const banner = await screen.findByTestId('window-banner');
    expect(banner.textContent).toBe(t.inbox.window.open.replace('{left}', '21س'));
    expect(banner.dataset['open']).toBe('true');
    expect(screen.queryByRole('button', { name: t.inbox.rating.send })).toBeNull();
  });

  it('closed: says how to reopen it; the composer offers «إرسال تقييم الحلقة»', async () => {
    renderThread({ lastInboundAgoMs: 30 * HOUR });
    expect((await screen.findByTestId('window-banner')).textContent).toBe(t.inbox.window.closed);
    expect(await screen.findByRole('button', { name: t.inbox.rating.send })).toBeTruthy();
  });
});

describe('«إرسال تقييم الحلقة»', () => {
  it('sends with a request id and says it went', async () => {
    renderThread({ lastInboundAgoMs: 30 * HOUR });
    apiSend.mockResolvedValue(message({ id: 'm-out', direction: 'outbound', status: 'sent', template_key: 'lesson_rating' }));
    const button = await screen.findByRole('button', { name: t.inbox.rating.send });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    expect(await screen.findByText(t.inbox.rating.sent)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', `${PATH}/rating`, { clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/) });
  });

  it('no lesson took place yet → the reason in words', async () => {
    renderThread({ lastInboundAgoMs: 30 * HOUR });
    apiSend.mockRejectedValue(new ApiError(404, { code: 'no_completed_lesson' }));
    const button = await screen.findByRole('button', { name: t.inbox.rating.send });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    expect((await screen.findByRole('alert')).textContent).toBe(t.inbox.rating.noLesson);
  });

  it('template not approved yet → disabled with the note; a lead’s chat has no button', async () => {
    renderThread({ lastInboundAgoMs: 30 * HOUR, templates: [template()] });
    expect(await screen.findByText(t.inbox.rating.notApproved)).toBeTruthy();
    expect((screen.getByRole('button', { name: t.inbox.rating.send }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('a lead (not a guardian) gets no rating button', async () => {
    renderThread({ lastInboundAgoMs: 30 * HOUR, guardian: false });
    await screen.findByTestId('window-banner');
    expect(screen.queryByRole('button', { name: t.inbox.rating.send })).toBeNull();
  });
});

describe('rating chip', () => {
  it('a guardian’s tap shows «التقييم: جيدة» on the bubble', async () => {
    renderThread({ lastInboundAgoMs: HOUR });
    expect((await screen.findByTestId('rating-chip')).textContent).toBe(t.inbox.rating.chip.replace('{rating}', 'جيدة'));
  });
});
