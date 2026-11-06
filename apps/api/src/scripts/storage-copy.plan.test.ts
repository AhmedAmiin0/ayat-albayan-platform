import { describe, expect, it } from 'vitest';
import { fakeS3 } from '@/common/storage/store/s3.fakes';
import { copyToMinio, tallyLine } from './storage-copy.plan';

const PDF = new TextEncoder().encode('%PDF-1.7');

async function stores() {
  const from = fakeS3();
  const to = fakeS3();
  await from.store.put({
    bucket: 'reports',
    key: 's/a.pdf',
    body: PDF,
    contentType: 'application/pdf',
  });
  await from.store.put({
    bucket: 'reports',
    key: 's/b.pdf',
    body: PDF,
    contentType: 'application/pdf',
  });
  await from.store.put({
    bucket: 'reports',
    key: '_probe/x.txt',
    body: PDF,
    contentType: 'text/plain',
  });
  await to.store.put({
    bucket: 'reports',
    key: 's/a.pdf',
    body: PDF,
    contentType: 'application/pdf',
  });
  return { from, to };
}

describe('storage-copy (docs/45)', () => {
  it('dry-run by default: counts, copies nothing', async () => {
    const { from, to } = await stores();
    const [t] = await copyToMinio({
      from: from.store,
      to: to.store,
      buckets: ['reports'],
      apply: false,
    });
    expect(t).toEqual({ bucket: 'reports', present: 1, copied: 0, pending: 1, failed: 0 });
    expect(to.objects.size).toBe(1);
    expect(
      tallyLine(t ?? { bucket: 'reports', present: 0, copied: 0, pending: 0, failed: 0 }),
    ).toBe('reports: 1 already in MinIO, 0 copied, 1 to copy, 0 failed');
  });

  it('--apply copies what is missing, keeps the type, and a second run copies nothing', async () => {
    const { from, to } = await stores();
    const plan = { from: from.store, to: to.store, buckets: ['reports'] as const, apply: true };
    expect((await copyToMinio(plan))[0]).toMatchObject({ copied: 1, present: 1 });
    expect(await to.store.info({ bucket: 'reports', key: 's/b.pdf' })).toEqual({
      size: 8,
      contentType: 'application/pdf',
    });
    expect((await copyToMinio(plan))[0]).toMatchObject({ copied: 0, present: 2 });
    expect(to.objects.has('ab-reports/_probe/x.txt')).toBe(false);
  });
});
