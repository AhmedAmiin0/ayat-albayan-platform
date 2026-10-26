import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message, PHONE } from '../../testing/inbox-fixture';
import { MessageMedia } from './MessageMedia';
import { InboxModeContext } from '../../shared/mode';
import { renderWithClient } from '../../testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const FILE = `/threads/${encodeURIComponent(PHONE)}/messages/m-1/file`;
const IMAGE = message({ id: 'm-1', body: null, media_mime: 'image/png' });
const saveName = t.inbox.download.label.replace('{name}', t.inbox.media.image);

afterEach(() => apiFetch.mockReset());

describe('MessageMedia: «تنزيل» on an opened file (owner 2026-10-26)', () => {
  it('the opened image gets «تنزيل», which signs a fresh download URL (not the cached view URL)', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    apiFetch.mockImplementation(async (path: string) => ({ url: `https://storage.test/x.png?p=${path}`, expires_at: '', mime: 'image/png' }));
    renderWithClient(<MessageMedia message={IMAGE} />);
    expect(screen.queryByRole('button', { name: saveName })).toBeNull(); // nothing signed before the click
    fireEvent.click(screen.getByRole('button', { name: t.inbox.viewMedia.replace('{kind}', t.inbox.media.image) }));
    fireEvent.click(await screen.findByRole('button', { name: saveName }));
    expect(apiFetch).toHaveBeenLastCalledWith(`${FILE}?download=1`);
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    click.mockRestore();
  });

  it('teacher mode: no «تنزيل» and no request, today’s «غير مسموح» label stays', () => {
    renderWithClient(
      <InboxModeContext.Provider value="teacher">
        <MessageMedia message={IMAGE} />
      </InboxModeContext.Provider>,
    );
    expect(screen.queryByRole('button', { name: saveName })).toBeNull();
    expect(screen.getByText(`· ${t.inbox.mediaNotAllowed}`)).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
