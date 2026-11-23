import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { channelPage } from '@ab/web-kit/components/channel/channel.fixtures';
import { showThread } from '@ab/web-kit/components/channel/thread.testing';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
const upload = vi.hoisted(() => vi.fn(async () => ({ error: null })));
vi.mock('@ab/web-kit/lib/http/supabase', () => ({
  supabase: {
    storage: { from: () => ({ uploadToSignedUrl: upload }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: async () => 'ok',
  },
}));

const c = t.studentChannel;
const MESSAGES = '/portal/students/s1/channel/messages';
const SLOT = { bucket: 'channel-media', path: 'ch/1.pdf', token: 'tk', signed_url: 'https://x/u' };

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  upload.mockClear();
  sessionStorage.clear();
});

describe('ChannelThread composer: emoji and files (FamChatWebAttach)', () => {
  it('an emoji goes in at the caret (here the end); the grid stays open for another', async () => {
    apiFetch.mockResolvedValue(channelPage());
    apiSend.mockResolvedValue({});
    showThread('portal');
    const box = await screen.findByLabelText<HTMLTextAreaElement>(c.messageLabel);
    fireEvent.change(box, { target: { value: 'شكرًا' } });
    fireEvent.click(screen.getByRole('button', { name: c.emoji }));
    fireEvent.click(screen.getByRole('button', { name: '🌹' }));
    expect(box.value).toBe('شكرًا🌹');
    expect(screen.getByRole('group', { name: c.emoji })).toBeTruthy();
  });

  it('a PDF: the signed slot, the upload, then the message that carries it', async () => {
    apiFetch.mockResolvedValue(channelPage());
    apiSend.mockImplementation(async (_m: string, path: string) =>
      path.endsWith('/upload-url') ? SLOT : {},
    );
    showThread('portal');
    fireEvent.click(await screen.findByRole('button', { name: c.media.attach }));
    const pdf = new File(['%PDF-1.7'], 'الخطة.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(c.media.pdf), { target: { files: [pdf] } });
    const fields = { mime: 'application/pdf', size: pdf.size, name: 'الخطة.pdf' };
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', `${MESSAGES.replace('/messages', '')}/attachments/upload-url`, fields),
    );
    expect(upload).toHaveBeenCalledWith('ch/1.pdf', 'tk', pdf, { contentType: 'application/pdf' });
    const post = { body: '', client_id: expect.any(String), attachment: { ...fields, path: 'ch/1.pdf' } };
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', MESSAGES, post));
  });

  it('a type the chat does not take is refused in words, nothing is uploaded', async () => {
    apiFetch.mockResolvedValue(channelPage());
    apiSend.mockResolvedValue({});
    showThread('portal');
    fireEvent.click(await screen.findByRole('button', { name: c.media.attach }));
    const gif = new File(['GIF89a'], 'a.gif', { type: 'image/gif' });
    fireEvent.change(screen.getByLabelText(c.media.photo), { target: { files: [gif] } });
    expect(await screen.findByText(c.media.badType)).toBeTruthy();
    expect(upload).not.toHaveBeenCalled();
  });

  it("a refused send says the API's reason (the chat closed), the words stay in the box", async () => {
    const { ApiError } = await import('@ab/web-kit/lib/http/api/api');
    apiFetch.mockResolvedValue(channelPage());
    apiSend.mockImplementation(async (_m: string, path: string) => {
      if (path === MESSAGES) throw new ApiError(409, { code: 'channel_not_open' });
      return {};
    });
    showThread('portal');
    const box = await screen.findByLabelText<HTMLTextAreaElement>(c.messageLabel);
    fireEvent.change(box, { target: { value: 'مرحبًا' } });
    fireEvent.click(screen.getByRole('button', { name: c.send }));
    expect(await screen.findByText(c.actions.errors.channel_not_open)).toBeTruthy();
    expect(box.value).toBe('مرحبًا');
  });
});
