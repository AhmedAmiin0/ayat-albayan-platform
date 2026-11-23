import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { rowIn } from '@ab/web-kit/components/channel/bubble/jump';
import { channelMessage, channelPage } from '@ab/web-kit/components/channel/channel.fixtures';
import { showThread } from '@ab/web-kit/components/channel/thread.testing';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const c = t.studentChannel;
const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
const theirs = channelMessage({ id: 'a1', body: 'هل نبدأ بالصفحة الأولى؟', sender_role: 'teacher', sender_name: 'أ. فاطمة', created_at: ago(5) });
const mine = channelMessage({ id: 'b2', body: 'جزاكم الله خيرًا', mine: true, read_by_all: true, created_at: ago(2) });
const READS = { read: [{ name: 'أ. فاطمة', role: 'teacher', at: ago(1) }], unread: [] };

const answer = (path: string) => {
  if (path.endsWith('/reads')) return Promise.resolve(READS);
  if (path.endsWith('/presence')) return Promise.resolve({ enabled: false, peers: [] });
  return Promise.resolve(channelPage({ messages: [theirs, mine] }));
};
const menuOf = (text: string) => {
  const row = screen.getByText(text).closest('li');
  if (!row) throw new Error(`no row for ${text}`);
  return within(row).getByRole('button', { name: c.actions.menu });
};

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  sessionStorage.clear();
});

describe('ChannelThread: «ردّ» and «معلومات الرسالة» (the app parity)', () => {
  it("someone else's message offers «ردّ» only; the reply bar names her and the send quotes it", async () => {
    apiFetch.mockImplementation(answer);
    apiSend.mockResolvedValue(channelMessage());
    showThread('portal');
    await screen.findByText(theirs.body);
    fireEvent.click(menuOf(theirs.body));
    expect(screen.queryByRole('button', { name: c.actions.edit })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: c.reply.action }));
    expect(screen.getByText(c.reply.replyingTo.replace('{name}', 'أ. فاطمة'))).toBeTruthy();
    fireEvent.change(screen.getByLabelText(c.messageLabel), { target: { value: 'نعم' } });
    fireEvent.click(screen.getByRole('button', { name: c.send }));
    const body = { body: 'نعم', client_id: expect.any(String), reply_to_id: 'a1' };
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/channel/messages', body));
    await waitFor(() => expect(screen.queryByText(c.reply.replyingTo.replace('{name}', 'أ. فاطمة'))).toBeNull());
  });

  it('«إلغاء الرد» drops the quote', async () => {
    apiFetch.mockImplementation(answer);
    apiSend.mockResolvedValue(channelMessage());
    showThread('teacher');
    await screen.findByText(theirs.body);
    fireEvent.click(menuOf(theirs.body));
    fireEvent.click(screen.getByRole('button', { name: c.reply.action }));
    fireEvent.click(screen.getByRole('button', { name: c.reply.cancel }));
    expect(screen.queryByText(c.reply.replyingTo.replace('{name}', 'أ. فاطمة'))).toBeNull();
  });

  it('my message: blue ✓✓ «قرأها الجميع», and «معلومات الرسالة» lists who read it', async () => {
    apiFetch.mockImplementation(answer);
    apiSend.mockResolvedValue(channelMessage());
    showThread('portal');
    await screen.findByText(mine.body);
    expect(screen.getByRole('img', { name: c.readByAll })).toBeTruthy();
    fireEvent.click(menuOf(mine.body));
    fireEvent.click(screen.getByRole('button', { name: c.reads.action }));
    const dialog = await screen.findByRole('dialog', { name: c.reads.title });
    expect(await within(dialog).findByText(c.reads.none)).toBeTruthy();
    expect(within(dialog).getByText(c.roles.teacher)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/channel/messages/b2/reads');
  });

  it('a reply shows its quote; a click on it goes to the original', async () => {
    const reply = channelMessage({
      id: 'c3',
      body: 'سنبدأ',
      mine: true,
      created_at: ago(1),
      reply_to: { id: 'a1', sender_name: 'أ. فاطمة', sender_role: 'teacher', body: theirs.body, kind: 'text', deleted: false },
    });
    apiFetch.mockImplementation((path: string) =>
      path.endsWith('/presence') ? answer(path) : Promise.resolve(channelPage({ messages: [theirs, reply] })),
    );
    apiSend.mockResolvedValue(channelMessage());
    showThread('portal');
    const quote = await screen.findByRole('button', { name: `${t.inbox.reply.jump}: أ. فاطمة` });
    fireEvent.click(quote);
    expect(rowIn(quote, 'a1')?.hasAttribute('data-flash')).toBe(true);
  });
});
