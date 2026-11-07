import { describe, expect, it } from 'vitest';
import { fakeS3 } from './s3.fakes';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

describe('S3Store (MinIO adapter) against a fake S3', () => {
  it('put / get / head / info / remove, buckets prefixed', async () => {
    const { objects, store } = fakeS3();
    await store.put({ bucket: 'receipts', key: 's1/a.png', body: PNG, contentType: 'image/png' });
    expect([...objects.keys()]).toEqual(['ab-receipts/s1/a.png']);
    expect(await store.get({ bucket: 'receipts', key: 's1/a.png' })).toEqual(PNG);
    expect(await store.head({ bucket: 'receipts', key: 's1/a.png' }, 4)).toEqual(PNG.slice(0, 4));
    expect(await store.info({ bucket: 'receipts', key: 's1/a.png' })).toEqual({
      size: 7,
      contentType: 'image/png',
    });
    await store.remove({ bucket: 'receipts', keys: ['s1/a.png', 'missing.png'] });
    expect(objects.size).toBe(0);
  });

  it('a missing object is null / false, like Supabase', async () => {
    const { store } = fakeS3();
    const o = { bucket: 'receipts', key: 'nope.png' } as const;
    expect([
      await store.get(o),
      await store.head(o, 4),
      await store.info(o),
      await store.exists(o),
    ]).toEqual([null, null, null, false]);
  });

  it('exists applies the bucket limits a Supabase bucket would (type)', async () => {
    const { store } = fakeS3();
    await store.put({ bucket: 'receipts', key: 's1/x.html', body: PNG, contentType: 'text/html' });
    await store.put({ bucket: 'receipts', key: 's1/y.png', body: PNG, contentType: 'image/png' });
    expect(await store.exists({ bucket: 'receipts', key: 's1/x.html' })).toBe(false);
    expect(await store.exists({ bucket: 'receipts', key: 's1/y.png' })).toBe(true);
  });

  it('list and copy', async () => {
    const { store } = fakeS3();
    await store.put({
      bucket: 'wa-media',
      key: 'out/u/r/a.pdf',
      body: PNG,
      contentType: 'application/pdf',
    });
    await store.copy({
      from: { bucket: 'wa-media', key: 'out/u/r/a.pdf' },
      to: { bucket: 'invoices', key: 'r/a.pdf' },
    });
    expect(await store.list({ bucket: 'invoices', prefix: 'r/' })).toEqual(['r/a.pdf']);
  });

  it('signs GET (with a save-as name) and PUT URLs; any other failure throws with S3’s error name only', async () => {
    const { store } = fakeS3();
    const url = await store.signedGet({ bucket: 'reports', key: 's/l.pdf', seconds: 300 });
    expect(url).toBe('https://files.example.com/ab-reports/s/l.pdf?X-Amz-Expires=300');
    const file = { size: 900, mime: 'image/png' };
    expect(await store.signedPut({ bucket: 'avatars', key: 'u/avatar-1.png', file })).toEqual({
      token: '',
      signedUrl: 'https://files.example.com/ab-avatars/u/avatar-1.png?X-Amz-Expires=900',
    });
    const broken = fakeS3();
    broken.objects.get = () => {
      throw Object.assign(new Error('secret detail'), {
        name: 'AccessDenied',
        $metadata: { httpStatusCode: 403 },
      });
    };
    await expect(broken.store.info({ bucket: 'reports', key: 'x' })).rejects.toThrow(
      'storage info failed: AccessDenied',
    );
  });
});
