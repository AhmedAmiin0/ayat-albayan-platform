import { describe, expect, it } from 'vitest';
import { MINIO_MARK, storageKeyOf, storageProviderOf, storedPath } from './stored-path.js';

describe('stored path marker (docs/45)', () => {
  it('a path without a marker is an old Supabase object', () => {
    expect(storageProviderOf('s1/l1.pdf')).toBe('supabase');
    expect(storageKeyOf('s1/l1.pdf')).toBe('s1/l1.pdf');
  });

  it('«minio:» names a MinIO object and is stripped for the key', () => {
    expect(MINIO_MARK).toBe('minio:');
    expect(storageProviderOf('minio:s1/l1.pdf')).toBe('minio');
    expect(storageKeyOf('minio:s1/l1.pdf')).toBe('s1/l1.pdf');
  });

  it('storedPath marks MinIO keys only and never twice', () => {
    expect(storedPath({ provider: 'minio', key: 'a/b.jpg' })).toBe('minio:a/b.jpg');
    expect(storedPath({ provider: 'minio', key: 'minio:a/b.jpg' })).toBe('minio:a/b.jpg');
    expect(storedPath({ provider: 'supabase', key: 'a/b.jpg' })).toBe('a/b.jpg');
    expect(storedPath({ provider: 'supabase', key: 'minio:a/b.jpg' })).toBe('a/b.jpg');
  });
});
