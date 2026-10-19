import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatUploadError, chatSendMime, sendFile, uploadChatFile } from './api.files';

const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(), apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from } } }));

const PHONE = '+966501234567';
const SIGNED = { bucket: 'wa-media', path: 'out/u-1/req-1/abc.png', token: 'tok', signed_url: 'https://x' };
const png = () => new File([new Uint8Array(9)], 'صورة.png', { type: 'image/png' });

afterEach(() => {
  apiSend.mockReset();
  uploadToSignedUrl.mockReset();
  from.mockReset();
});

describe('chatSendMime', () => {
  it('takes JPEG, PNG and PDF only', () => {
    expect(chatSendMime({ type: 'image/png' })).toBe('image/png');
    expect(chatSendMime({ type: 'application/pdf' })).toBe('application/pdf');
    expect(chatSendMime({ type: 'image/webp' })).toBeNull();
    expect(chatSendMime({ type: 'image/heic' })).toBeNull();
    expect(chatSendMime({ type: '' })).toBeNull();
  });
});

describe('uploadChatFile', () => {
  it('asks the thread for a signed URL for this request, uploads with the file’s type, returns the path', async () => {
    apiSend.mockResolvedValue(SIGNED);
    from.mockReturnValue({ uploadToSignedUrl });
    uploadToSignedUrl.mockResolvedValue({ error: null });
    const file = png();
    await expect(uploadChatFile({ phone: PHONE, requestId: 'req-1', file })).resolves.toBe(SIGNED.path);
    expect(apiSend).toHaveBeenCalledWith('POST', '/threads/%2B966501234567/file-upload-url', {
      clientRequestId: 'req-1',
      mime: 'image/png',
      size: 9,
    });
    expect(from).toHaveBeenCalledWith('wa-media');
    expect(uploadToSignedUrl).toHaveBeenCalledWith(SIGNED.path, 'tok', file, { contentType: 'image/png' });
  });

  it('a storage failure is a ChatUploadError (file_upload)', async () => {
    apiSend.mockResolvedValue(SIGNED);
    from.mockReturnValue({ uploadToSignedUrl });
    uploadToSignedUrl.mockResolvedValue({ error: new Error('quota') });
    const err = await uploadChatFile({ phone: PHONE, requestId: 'req-1', file: png() }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatUploadError);
    expect((err as ChatUploadError).code).toBe('file_upload');
  });

  it('an unsupported type never asks for a URL', async () => {
    const webp = new File(['x'], 'a.webp', { type: 'image/webp' });
    await expect(uploadChatFile({ phone: PHONE, requestId: 'r', file: webp })).rejects.toBeInstanceOf(ChatUploadError);
    expect(apiSend).not.toHaveBeenCalled();
  });
});

describe('sendFile', () => {
  it('POSTs the path, name and caption to the thread', async () => {
    apiSend.mockResolvedValue({ id: 'm-1' });
    await sendFile({ phone: PHONE, clientRequestId: 'req-1', path: SIGNED.path, filename: 'صورة.png', caption: 'تفضلي' });
    expect(apiSend).toHaveBeenCalledWith('POST', '/threads/%2B966501234567/file', {
      clientRequestId: 'req-1',
      path: SIGNED.path,
      filename: 'صورة.png',
      caption: 'تفضلي',
    });
  });
});
