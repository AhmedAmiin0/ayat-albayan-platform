import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../db/db.module';
import { StorageService } from './storage.service';

function fakeStorage(bucketApi: Record<string, ReturnType<typeof vi.fn>>) {
  const from = vi.fn().mockReturnValue(bucketApi);
  return { svc: new StorageService({ storage: { from } } as unknown as Db), from };
}

describe('StorageService (R-REP-02/03, R-PAY-01)', () => {
  it('signedUpload returns the path, token and URL for that bucket', async () => {
    const createSignedUploadUrl = vi
      .fn()
      .mockResolvedValue({ data: { path: 'sub/x.jpg', token: 't', signedUrl: 'http://u' }, error: null });
    const { svc, from } = fakeStorage({ createSignedUploadUrl });
    expect(await svc.signedUpload({ bucket: 'receipts', path: 'sub/x.jpg' })).toEqual({
      bucket: 'receipts',
      path: 'sub/x.jpg',
      token: 't',
      signed_url: 'http://u',
    });
    expect(from).toHaveBeenCalledWith('receipts');
  });

  it('signedDownload defaults to 1 hour and reports the expiry', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'http://d' }, error: null });
    const { svc } = fakeStorage({ createSignedUrl });
    vi.useFakeTimers({ now: new Date('2026-10-02T10:00:00Z') });
    const r = await svc.signedDownload({ bucket: 'reports', path: 's/l.pdf' });
    vi.useRealTimers();
    expect(createSignedUrl).toHaveBeenCalledWith('s/l.pdf', 3600);
    expect(r).toEqual({ url: 'http://d', expires_at: '2026-10-02T11:00:00.000Z' });
  });

  it('signedDownload with a file name: added once-encoded, so an Arabic name is saved as itself', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'http://d?token=t' }, error: null });
    const { svc } = fakeStorage({ createSignedUrl });
    const r = await svc.signedDownload({ bucket: 'reports', path: 's/l.pdf', download: 'AB-0183_تقرير.pdf' });
    expect(createSignedUrl).toHaveBeenCalledWith('s/l.pdf', 3600);
    expect(r.url).toBe(`http://d?token=t&download=${encodeURIComponent('AB-0183_تقرير.pdf')}`);
  });

  it('upload overwrites (a re-rendered PDF keeps its path)', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const { svc } = fakeStorage({ upload });
    const body = new Uint8Array([1]);
    await svc.upload({ bucket: 'reports', path: 's/l.pdf', body, contentType: 'application/pdf' });
    expect(upload).toHaveBeenCalledWith('s/l.pdf', body, { contentType: 'application/pdf', upsert: true });
  });

  it('info returns size and content type, null when the object is missing', async () => {
    const info = vi
      .fn()
      .mockResolvedValueOnce({ data: { size: 2048, contentType: 'image/png' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
    const { svc, from } = fakeStorage({ info });
    expect(await svc.info({ bucket: 'invoices', path: 'r/a.png' })).toEqual({ size: 2048, contentType: 'image/png' });
    expect(from).toHaveBeenCalledWith('invoices');
    expect(await svc.info({ bucket: 'invoices', path: 'r/none.png' })).toBeNull();
  });

  it('copy goes across buckets on the server and is idempotent (an existing target is kept)', async () => {
    const copy = vi.fn().mockResolvedValue({ error: null });
    const exists = vi.fn().mockResolvedValueOnce({ data: false, error: null }).mockResolvedValueOnce({ data: true, error: null });
    const { svc, from } = fakeStorage({ copy, exists });
    const input = { from: { bucket: 'wa-media' as const, path: 'm.png' }, to: { bucket: 'invoices' as const, path: 'r/wa-m.png' } };
    await svc.copy(input);
    await svc.copy(input);
    expect(copy).toHaveBeenCalledTimes(1);
    expect(copy).toHaveBeenCalledWith('m.png', 'r/wa-m.png', { destinationBucket: 'invoices' });
    expect(from).toHaveBeenCalledWith('wa-media');
  });

  it('copy throws when Storage fails', async () => {
    const { svc } = fakeStorage({
      exists: vi.fn().mockResolvedValue({ data: false, error: null }),
      copy: vi.fn().mockResolvedValue({ error: { message: 'nope' } }),
    });
    const input = { from: { bucket: 'wa-media' as const, path: 'a' }, to: { bucket: 'invoices' as const, path: 'b' } };
    await expect(svc.copy(input)).rejects.toThrow(/nope/);
  });

  it('exists is false on an error; remove and upload throw on one', async () => {
    const err = { error: { message: 'nope' } };
    const { svc } = fakeStorage({
      exists: vi.fn().mockResolvedValue({ data: null, ...err }),
      remove: vi.fn().mockResolvedValue(err),
      upload: vi.fn().mockResolvedValue(err),
    });
    expect(await svc.exists({ bucket: 'receipts', path: 'a/b' })).toBe(false);
    await expect(svc.remove({ bucket: 'receipts', path: 'a/b' })).rejects.toThrow(/nope/);
    const write = { bucket: 'reports' as const, path: 'a', body: new Uint8Array(), contentType: 'x' };
    await expect(svc.upload(write)).rejects.toThrow(/nope/);
  });

  it('removeMany sends every path in one call and skips an empty list', async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const { svc } = fakeStorage({ remove });
    await svc.removeMany({ bucket: 'wa-media', paths: [] });
    expect(remove).not.toHaveBeenCalled();
    await svc.removeMany({ bucket: 'wa-media', paths: ['a.ogg', 'b.mp4'] });
    expect(remove).toHaveBeenCalledWith(['a.ogg', 'b.mp4']);
    remove.mockResolvedValue({ error: { message: 'nope' } });
    await expect(svc.removeMany({ bucket: 'wa-media', paths: ['a.ogg'] })).rejects.toThrow(/nope/);
  });
});
