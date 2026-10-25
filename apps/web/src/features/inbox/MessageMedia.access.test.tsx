import type { MessageView } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { threadFileQuery } from './api';
import { message, PHONE } from './inbox-fixture';
import { MessageMedia } from './MessageMedia';
import { InboxModeContext } from './mode';
import { renderWithClient } from './test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const SIGNED = 'https://storage.test/wa-media/m-1.png?token=x';
const IMAGE = message({ id: 'm-1', body: 'صورة الاستمارة', media_mime: 'image/png' }) satisfies MessageView;
const viewName = t.inbox.viewMedia.replace('{kind}', t.inbox.media.image);
const imgName = t.inbox.openMedia.replace('{kind}', t.inbox.media.image);

afterEach(() => apiFetch.mockReset());

describe('MessageMedia: who may open a file (m9) and a failed refetch (m15)', () => {
  it('teacher mode: the label, no «عرض صورة» button and no request (the API answers 403)', () => {
    renderWithClient(
      <InboxModeContext.Provider value="teacher">
        <MessageMedia message={IMAGE} />
      </InboxModeContext.Provider>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(`· ${t.inbox.mediaNotAllowed}`)).toBeTruthy();
    // Round 2 J: a permanent refusal, not «not here yet».
    expect(screen.queryByText(`· ${t.inbox.mediaNotDownloaded}`)).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('a 403 media_forbidden after the click falls back to the label, not an error', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, { code: 'media_forbidden' }));
    renderWithClient(<MessageMedia message={IMAGE} />);
    fireEvent.click(screen.getByRole('button', { name: viewName }));
    expect(await screen.findByText(`· ${t.inbox.mediaNotAllowed}`)).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a loaded thumbnail stays when a background refetch fails', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    apiFetch.mockResolvedValueOnce({ url: SIGNED, expires_at: '2026-10-19T12:00:00Z', mime: 'image/png' });
    render(
      <QueryClientProvider client={client}>
        <MessageMedia message={IMAGE} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: viewName }));
    await screen.findByRole('img', { name: imgName });
    apiFetch.mockRejectedValueOnce(new ApiError(502, { code: 'meta_error' }));
    await client.refetchQueries({ queryKey: threadFileQuery(PHONE, 'm-1').queryKey });
    expect(client.getQueryState(threadFileQuery(PHONE, 'm-1').queryKey)?.status).toBe('error');
    expect(screen.getByRole('img', { name: imgName })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
