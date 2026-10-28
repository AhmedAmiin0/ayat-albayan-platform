import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../db/db.module';
import { StorageService } from './storage.service';

// signedDownloads: a list's photos in ONE createSignedUrls call (owner 2026-10-28).

function fakeStorage(createSignedUrls: ReturnType<typeof vi.fn>) {
  const from = vi.fn().mockReturnValue({ createSignedUrls });
  return new StorageService({ storage: { from } } as unknown as Db);
}

describe('StorageService.signedDownloads', () => {
  it('signs every path in one call and leaves an unsignable one out', async () => {
    const createSignedUrls = vi.fn().mockResolvedValue({
      data: [
        { path: 'a.png', signedUrl: 'http://a', error: null },
        { path: 'b.png', signedUrl: '', error: 'Either the object does not exist or you do not have access to it' },
      ],
      error: null,
    });
    const urls = await fakeStorage(createSignedUrls).signedDownloads({ bucket: 'avatars', paths: ['a.png', 'b.png'], seconds: 900 });
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls).toHaveBeenCalledWith(['a.png', 'b.png'], 900);
    expect([...urls]).toEqual([['a.png', 'http://a']]);
  });

  it('makes no call for no paths and throws on a Storage error', async () => {
    const createSignedUrls = vi.fn().mockResolvedValue({ data: null, error: { message: 'down' } });
    const svc = fakeStorage(createSignedUrls);
    expect((await svc.signedDownloads({ bucket: 'avatars', paths: [], seconds: 900 })).size).toBe(0);
    expect(createSignedUrls).not.toHaveBeenCalled();
    await expect(svc.signedDownloads({ bucket: 'avatars', paths: ['a'], seconds: 900 })).rejects.toThrow('down');
  });
});
