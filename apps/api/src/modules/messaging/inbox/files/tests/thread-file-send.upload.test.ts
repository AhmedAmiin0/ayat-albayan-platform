import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import {
  ACTOR,
  code,
  MB,
  NOW,
  queries,
  REQ,
  sender,
  status,
  storage,
} from './fixtures/file-sender.fixture';

describe('ThreadFileSender.uploadUrl', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    queries.thread.mockResolvedValue(threadRow());
    storage.signedUpload.mockResolvedValue({ bucket: 'wa-media', path: 'p', token: 't', signed_url: 'http://up' });
  });
  const upload = (mime: string, size: number, s = sender()) =>
    s.uploadUrl(
      { phone: PHONE, input: { clientRequestId: REQ, mime, size } as never, actorId: ACTOR },
      NOW,
    );
  afterEach(() => vi.unstubAllEnvs());

  it('signs a wa-media path out/{actor}/{request}/{uuid}.{ext}', async () => {
    await expect(upload('application/pdf', 1000)).resolves.toMatchObject({ signed_url: 'http://up' });
    const [ref] = storage.signedUpload.mock.calls[0] as [{ bucket: string; path: string }];
    expect(ref.bucket).toBe('wa-media');
    expect(ref.path).toMatch(new RegExp(`^out/${ACTOR}/${REQ}/[0-9a-f-]{36}\\.pdf$`));
  });

  it('refuses a wrong type (400) or a too large file (413) before signing', async () => {
    const e1 = await upload('image/heic', 1000).catch((x: unknown) => x);
    const e2 = await upload('image/jpeg', 6 * MB).catch((x: unknown) => x);
    expect([status(e1), code(e1), status(e2), code(e2)]).toEqual([400, 'file_type', 413, 'file_too_large']);
    expect(storage.signedUpload).not.toHaveBeenCalled();
  });

  it('a closed window or no thread: 409 session_closed, nothing signed (no orphan upload)', async () => {
    queries.thread.mockResolvedValueOnce(threadRow({ last_inbound_at: '2026-09-01T08:00:00Z', last_notifications_inbound_at: '2026-09-01T08:00:00Z' }));
    queries.thread.mockResolvedValueOnce(null);
    for (let i = 0; i < 2; i++) {
      const e = await upload('image/png', 1000).catch((x: unknown) => x);
      expect([status(e), code(e)]).toEqual([409, 'session_closed']);
    }
    expect(queries.thread).toHaveBeenCalledWith(PHONE);
    expect(storage.signedUpload).not.toHaveBeenCalled();
  });
});
