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

  it('upload overwrites (a re-rendered PDF keeps its path)', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const { svc } = fakeStorage({ upload });
    const body = new Uint8Array([1]);
    await svc.upload({ bucket: 'reports', path: 's/l.pdf', body, contentType: 'application/pdf' });
    expect(upload).toHaveBeenCalledWith('s/l.pdf', body, { contentType: 'application/pdf', upsert: true });
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
});
