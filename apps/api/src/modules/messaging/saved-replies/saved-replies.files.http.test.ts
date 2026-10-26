import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { replyId, repliesApp, row } from './saved-replies.fakes';

type App = Awaited<ReturnType<typeof repliesApp>>;
const OLD = 'saved/s1/old.pdf';
const withFile = { attachment_path: OLD, attachment_mime: 'application/pdf', attachment_name: 'قديم.pdf', attachment_size: 500 };
const REQ = '0d000000-0000-4000-8000-000000000001';

describe('saved reply attachments (wa-media saved/{actor}/…)', () => {
  let t: App;
  beforeEach(async () => {
    t = await repliesApp({ rows: [row({ n: 1, owner_profile_id: 's1', ...withFile }), row({ n: 2, owner_profile_id: 's1' })] });
  });
  afterAll(() => t.app.close());

  it('signs an upload under the uploader\'s own folder; a WebP or a 6 MB image is refused', async () => {
    const res = await t.call({ method: 'POST', url: '/saved-replies/attachment-upload-url', token: 'sales', body: { mime: 'application/pdf', size: 1000 } });
    expect(res.statusCode).toBe(201);
    expect(res.json<{ bucket: string; path: string }>()).toMatchObject({ bucket: 'wa-media', path: expect.stringMatching(/^saved\/s1\/[0-9a-f-]{36}\.pdf$/) });
    expect((await t.call({ method: 'POST', url: '/saved-replies/attachment-upload-url', token: 'sales', body: { mime: 'image/webp', size: 10 } })).statusCode).toBe(400);
    const big = await t.call({ method: 'POST', url: '/saved-replies/attachment-upload-url', token: 'sales', body: { mime: 'image/png', size: 6 * 1024 * 1024 } });
    expect([big.statusCode, big.json<{ code: string }>().code]).toEqual([413, 'file_too_large']);
  });

  it('keeps a checked file on create; another person\'s path or bytes that are not a PDF are refused', async () => {
    const ok = await t.call({ method: 'POST', url: '/saved-replies', token: 'sales', body: { scope: 'mine', title: 'ع', body: 'ب', attachment: { path: 'saved/s1/new.pdf', name: 'الأسعار.pdf' } } });
    expect([ok.statusCode, ok.json<{ attachment: unknown }>().attachment]).toEqual([201, { name: 'الأسعار.pdf', mime: 'application/pdf', size: 2048 }]);
    const theirs = await t.call({ method: 'POST', url: '/saved-replies', token: 'sales', body: { scope: 'mine', title: 'ع', body: 'ب', attachment: { path: 'saved/s2/x.pdf', name: 'x.pdf' } } });
    expect([theirs.statusCode, theirs.json<{ code: string }>().code]).toEqual([400, 'file_path']);
    t.storage.head.mockResolvedValueOnce(new TextEncoder().encode('GIF89a......'));
    const fake = await t.call({ method: 'POST', url: '/saved-replies', token: 'sales', body: { scope: 'mine', title: 'ع', body: 'ب', attachment: { path: 'saved/s1/y.pdf', name: 'y.pdf' } } });
    expect([fake.statusCode, fake.json<{ code: string }>().code]).toEqual([400, 'file_type']);
  });

  it('a replaced attachment leaves Storage; renaming the same file keeps it', async () => {
    await t.call({ method: 'PATCH', url: `/saved-replies/${replyId(1)}`, token: 'sales', body: { attachment: { path: OLD, name: 'جديد.pdf' } } });
    expect(t.storage.remove).not.toHaveBeenCalled();
    expect(t.replies.table[0]?.attachment_name).toBe('جديد.pdf');
    await t.call({ method: 'PATCH', url: `/saved-replies/${replyId(1)}`, token: 'sales', body: { attachment: { path: 'saved/s1/new.pdf', name: 'ب.pdf' } } });
    expect(t.storage.remove).toHaveBeenCalledWith({ bucket: 'wa-media', path: OLD });
  });

  it('removing the attachment (null) clears its columns and its file', async () => {
    const res = await t.call({ method: 'PATCH', url: `/saved-replies/${replyId(1)}`, token: 'sales', body: { attachment: null } });
    expect(res.json<{ attachment: unknown }>().attachment).toBeNull();
    expect(t.replies.table[0]).toMatchObject({ attachment_path: null, attachment_mime: null, attachment_name: null, attachment_size: null });
    expect(t.storage.remove).toHaveBeenCalledWith({ bucket: 'wa-media', path: OLD });
  });

  it('deleting the reply deletes its file; a Storage failure does not fail the delete', async () => {
    t.storage.remove.mockRejectedValueOnce(new Error('storage down'));
    const res = await t.call({ method: 'DELETE', url: `/saved-replies/${replyId(1)}`, token: 'sales' });
    expect(res.statusCode).toBe(204);
    expect(t.storage.remove).toHaveBeenCalledWith({ bucket: 'wa-media', path: OLD });
  });

  it('stage copies the file as the sender\'s chat file for POST /threads/:phone/file; no file is 404', async () => {
    const res = await t.call({ method: 'POST', url: `/saved-replies/${replyId(1)}/stage`, token: 'sales', body: { clientRequestId: REQ } });
    expect(res.statusCode).toBe(201);
    const staged = res.json<{ path: string; filename: string }>();
    expect(staged).toEqual({ path: expect.stringMatching(new RegExp(`^out/s1/${REQ}/[0-9a-f-]{36}\\.pdf$`)), filename: 'قديم.pdf' });
    expect(t.storage.copy).toHaveBeenCalledWith({ from: { bucket: 'wa-media', path: OLD }, to: { bucket: 'wa-media', path: staged.path } });
    expect((await t.call({ method: 'POST', url: `/saved-replies/${replyId(2)}/stage`, token: 'sales', body: { clientRequestId: REQ } })).statusCode).toBe(404);
    expect((await t.call({ method: 'POST', url: `/saved-replies/${replyId(1)}/stage`, token: 'sales', body: {} })).statusCode).toBe(400);
  });
});
