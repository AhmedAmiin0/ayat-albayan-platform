import { viewerTz } from '@ab/client-core';
import { lessonWhenAt } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { t } from '@/lib/i18n/i18n';
import { detail, lead, message, PHONE, template } from '../../testing/inbox-fixture';
import { renderWithClient, routeFetch } from '../../testing/test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));

const LINK = 'https://wa.me/966501234567?text=x';
const FAILED = message({
  id: 'm-f',
  direction: 'outbound',
  status: 'failed',
  body: 'تذكير بالحلقة',
  error_code: '131049',
  click_to_chat: LINK,
  created_at: '2026-10-01T11:00:00Z',
});
const WAITING = message({
  id: 'm-w',
  direction: 'outbound',
  status: 'queued',
  template_key: 'renewal_due',
  body: 'بقيت حلقتان',
  click_to_chat: LINK,
  created_at: '2026-10-01T12:00:00Z',
});
const PHOTO = message({ id: 'm-p', body: null, media_mime: 'image/jpeg', media_url: 'https://sb.test/signed/p.jpg' });
const CONFIRM = message({
  id: 'm-c',
  body: 'تمام، هنحضر',
  guardian_id: 'g-1',
  interactive_payload: { payload: 'confirm:l-1' },
  lesson_id: 'l-1',
  lesson: { starts_at: '2026-10-04T14:00:00Z', status: 'confirmed' },
});
const UNLINKED = message({ id: 'm-u', body: 'تمام', guardian_id: 'g-1' });
const HANDED = message({ ...FAILED, id: 'm-h', body: 'رسالة باليد', error_code: 'handed_off', created_at: '2026-10-01T11:30:00Z' });

function renderThread() {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', detail([PHOTO, CONFIRM, UNLINKED, FAILED, HANDED, WAITING])],
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
  it('media placeholders open the signed file; a quick reply says what it did, not what it looked like', async () => {
    renderThread();
    await screen.findByRole('log');
    const open = screen.getByRole('link', { name: t.inbox.openMedia.replace('{kind}', t.inbox.media.image) });
    expect(open.getAttribute('href')).toBe(PHOTO.media_url);
    // In the viewer's zone (no /auth/me here: the browser's), as the app's reply note reads it.
    const when = lessonWhenAt(new Date('2026-10-04T14:00:00Z'), { tz: viewerTz(), cycle: '24', locale: 'ar' });
    const confirmed = t.inbox.quickReply.confirmed.replace('{when}', when);
    expect(bubble('تمام، هنحضر').getByText(confirmed)).toBeTruthy();
    // An unlinked «تمام» with no lesson to confirm says nothing (owner 2026-10-28: no «لم تتأكد أي حلقة»).
    expect(bubble('تمام').queryByText('لم تتأكد أي حلقة بهذا الرد')).toBeNull();
  });

  it('a failed send: the saffron «!» named «لم تُرسل», the reason in words, retry puts it back in the queue', async () => {
    renderThread();
    await screen.findByRole('log');
    const failed = bubble('تذكير بالحلقة');
    const ticks = failed.getByRole('img', { name: t.enums.messageStatus.failed });
    expect(ticks.getAttribute('data-ticks')).toBe('failed');
    expect(ticks.getAttribute('class')).toContain('text-act');
    expect(failed.getByText(t.messages.errorLine.replace('{reason}', t.messages.errors['131049']))).toBeTruthy();
    apiSend.mockResolvedValue({ ...FAILED, status: 'queued' });
    fireEvent.click(failed.getByRole('button', { name: t.messages.retry }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messages/m-f/retry'));
    expect(await screen.findByText(t.messages.retryQueued)).toBeTruthy();
  });

  it('a held row asks «بعتّها؟» from its own state (survives a refresh): yes = sent by hand, no = back to the queue', async () => {
    renderThread();
    await screen.findByRole('log');
    const held = bubble('رسالة باليد');
    const ask = held.getByRole('group', { name: t.messages.markSentManually });
    expect(within(ask).getByText(t.messages.handedOff)).toBeTruthy();
    expect(held.queryByRole('button', { name: t.messages.retry })).toBeNull();
    apiSend.mockResolvedValue({ ...HANDED, status: 'sent_manually' });
    fireEvent.click(within(ask).getByRole('button', { name: t.messages.markSentManually }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messages/m-h/sent-manually'));
    fireEvent.click(within(ask).getByRole('button', { name: t.messages.undoHandOff }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messages/m-h/retry'));
  });

  it('a queued row whose template Meta has not approved says so', async () => {
    renderThread();
    await screen.findByRole('log');
    const waiting = bubble('بقيت حلقتان');
    await waitFor(() => expect(waiting.getByText(t.messages.waitingTemplate)).toBeTruthy());
    expect(waiting.getByText(t.inbox.templateLine.replace('{name}', t.templates.names.renewal_due))).toBeTruthy();
    expect(waiting.queryByRole('button', { name: t.messages.retry })).toBeNull();
    expect(waiting.getByRole('link', { name: t.messages.clickToChat })).toBeTruthy();
  });
});
