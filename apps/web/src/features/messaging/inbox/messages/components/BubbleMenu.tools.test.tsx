import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { ChatActionsProvider } from '../../shared/ChatActionsProvider';
import { message, PHONE, thread } from '../../testing/inbox-fixture';
import { MessageLog } from './MessageLog';
import { renderWithClient } from '../../testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const base = { phone: PHONE, hasMore: false, loadingOlder: false, onOlder: vi.fn(), waitingKeys: new Set<string>() };
const BODY = 'السلام عليكم\nموعد الحلقة الساعة ٥';
const TEXT = message({ id: 'm1', body: BODY, replyable: true, forwardable: true });
const PDF = message({ id: 'm1', body: null, media_mime: 'application/pdf', media_name: 'خطة الحفظ.pdf', replyable: true, forwardable: true });
const writeText = vi.fn();

function openMenu(m: typeof TEXT) {
  renderWithClient(
    <ChatActionsProvider thread={thread()} enabled>
      <MessageLog {...base} messages={[m]} />
    </ChatActionsProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: t.inbox.reply.menu }));
}
const menuLabels = () => {
  const menu = screen.getByRole('button', { name: t.inbox.forward.action }).parentElement;
  if (!menu) throw new Error('no menu');
  return within(menu).getAllByRole('button').map((b) => b.textContent);
};

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(() => apiFetch.mockReset());

describe('the bubble menu’s «نسخ» and «تنزيل» (owner 2026-10-26)', () => {
  it('a text message: WhatsApp’s order, no «تنزيل»; «نسخ» puts the exact body on the clipboard', async () => {
    openMenu(TEXT);
    expect(menuLabels()).toEqual([t.inbox.reply.action, t.inbox.copy.action, t.inbox.forward.action]);
    fireEvent.click(screen.getByRole('button', { name: t.inbox.copy.label }));
    expect(writeText).toHaveBeenCalledWith(BODY);
    expect(await screen.findByText(t.inbox.copy.done)).toBeTruthy();
  });

  it('a refused clipboard says so', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    openMenu(TEXT);
    fireEvent.click(screen.getByRole('button', { name: t.inbox.copy.label }));
    expect(await screen.findByText(t.inbox.copy.failed)).toBeTruthy();
  });

  it('a file without text: «تنزيل» last and no «نسخ»; it asks a fresh download URL and saves it', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    apiFetch.mockResolvedValue({ url: 'https://storage.test/a.pdf?token=x&download=x', expires_at: '', mime: 'application/pdf' });
    openMenu(PDF);
    expect(menuLabels()).toEqual([t.inbox.reply.action, t.inbox.forward.action, t.inbox.download.action]);
    fireEvent.click(screen.getByRole('button', { name: t.inbox.download.label.replace('{name}', 'خطة الحفظ.pdf') }));
    expect(apiFetch).toHaveBeenCalledWith(`/threads/${encodeURIComponent(PHONE)}/messages/m1/file?download=1`);
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    click.mockRestore();
  });

  it('a 403 on download keeps today’s «غير مسموح» text', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, { code: 'media_forbidden' }));
    openMenu(PDF);
    fireEvent.click(screen.getByRole('button', { name: t.inbox.download.label.replace('{name}', 'خطة الحفظ.pdf') }));
    expect(await screen.findByText(t.inbox.mediaNotAllowed)).toBeTruthy();
  });
});
