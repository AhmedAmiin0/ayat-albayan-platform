import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/features/messaging/settings-fixture';
import { t } from '@/lib/i18n';
import { detail, lead, message, PHONE, template } from './inbox-fixture';
import { renderWithClient, routeFetch } from './test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));

const LINK = 'https://wa.me/966501234567?text=x';
const FAILED = message({
  id: 'm-f',
  direction: 'outbound',
  status: 'failed',
  body: 'تذكير بالحلقة',
  error_code: '131026',
  click_to_chat: LINK,
  created_at: '2026-10-01T11:00:00Z',
});
const WAITING = message({
  id: 'm-w',
  direction: 'outbound',
  status: 'queued',
  template_key: 'renewal_due',
  body: 'فاضل حلقتين',
  click_to_chat: LINK,
  created_at: '2026-10-01T12:00:00Z',
});
const PHOTO = message({ id: 'm-p', body: null, media_mime: 'image/jpeg', media_url: 'https://sb.test/signed/p.jpg' });
const CONFIRM = message({ id: 'm-c', body: 'تمام، هنحضر', interactive_payload: { payload: 'confirm:l-1' } });

function renderThread() {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', detail([PHOTO, CONFIRM, FAILED, WAITING])],
    ['/messaging/templates', [template({ key: 'renewal_due', status: 'pending' })]],
    ['/settings', SETTINGS],
    ['/leads?', { items: [lead()], total: 1, page: 1, pageSize: 5 }],
  ]);
  renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
}

const bubble = (text: string) => {
  const el = screen.getByText(text).closest('article');
  if (!el) throw new Error(`no bubble for ${text}`);
  return within(el);
};

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('message log (R-MSG-05, R-MSG-03)', () => {
  it('media placeholders open the signed file; a tapped quick reply says what it meant', async () => {
    renderThread();
    await screen.findByRole('log');
    const open = screen.getByRole('link', { name: t.inbox.openMedia.replace('{kind}', t.inbox.media.image) });
    expect(open.getAttribute('href')).toBe(PHOTO.media_url);
    expect(bubble('تمام، هنحضر').getByText(t.inbox.quickReply.confirm)).toBeTruthy();
  });

  it('a failed send: saffron chip, the reason in words, retry puts it back in the queue', async () => {
    renderThread();
    await screen.findByRole('log');
    const failed = bubble('تذكير بالحلقة');
    const chip = failed.getByText(t.enums.messageStatus.failed).closest('[data-tone]');
    expect(chip?.getAttribute('data-tone')).toBe('act');
    expect(failed.getByText(t.messages.errorLine.replace('{reason}', t.messages.errors['131026']))).toBeTruthy();
    apiSend.mockResolvedValue({ ...FAILED, status: 'queued' });
    fireEvent.click(failed.getByRole('button', { name: t.messages.retry }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messages/m-f/retry'));
    expect(await screen.findByText(t.messages.retryQueued)).toBeTruthy();
  });

  it('click-to-chat opens wa.me, then asks before recording it was sent by hand', async () => {
    renderThread();
    await screen.findByRole('log');
    const failed = bubble('تذكير بالحلقة');
    const link = failed.getByRole('link', { name: t.messages.clickToChat });
    expect(link.getAttribute('href')).toBe(LINK);
    expect(link.getAttribute('target')).toBe('_blank');
    fireEvent.click(link);
    const ask = screen.getByRole('group', { name: t.messages.markSentManually });
    expect(within(ask).getByText(t.messages.sentManuallyConfirm)).toBeTruthy();
    apiSend.mockResolvedValue({ ...FAILED, status: 'sent_manually' });
    fireEvent.click(within(ask).getByRole('button', { name: t.messages.markSentManually }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messages/m-f/sent-manually'));
  });

  it('a queued row whose template Meta has not approved says so', async () => {
    renderThread();
    await screen.findByRole('log');
    const waiting = bubble('فاضل حلقتين');
    await waitFor(() => expect(waiting.getByText(t.messages.waitingTemplate)).toBeTruthy());
    expect(waiting.getByText(t.inbox.templateLine.replace('{name}', t.templates.names.renewal_due))).toBeTruthy();
    expect(waiting.queryByRole('button', { name: t.messages.retry })).toBeNull();
    expect(waiting.getByRole('link', { name: t.messages.clickToChat })).toBeTruthy();
  });
});
