import { describe, expect, it } from 'vitest';
import { threadFileSendSchema, threadFileUploadSchema } from './schemas.js';

const id = '7b0f5b8e-3c1a-4a52-9d0e-2b7c1f0a9e11';

describe('threadFileUploadSchema', () => {
  it('takes a JPEG, PNG or PDF', () => {
    for (const mime of ['image/jpeg', 'image/png', 'application/pdf']) {
      expect(threadFileUploadSchema.safeParse({ clientRequestId: id, mime, size: 10 }).success).toBe(true);
    }
  });

  it('refuses WebP with file_type, an empty file and a missing request id', () => {
    const webp = threadFileUploadSchema.safeParse({ clientRequestId: id, mime: 'image/webp', size: 10 });
    expect(webp.success ? '' : webp.error.issues[0]?.message).toBe('file_type');
    expect(threadFileUploadSchema.safeParse({ clientRequestId: id, mime: 'image/png', size: 0 }).success).toBe(false);
    expect(threadFileUploadSchema.safeParse({ mime: 'image/png', size: 10 }).success).toBe(false);
  });
});

describe('threadFileSendSchema', () => {
  const base = { clientRequestId: id, path: 'out/a/b/c.png' };

  it('trims the name and an optional caption', () => {
    const r = threadFileSendSchema.safeParse({ ...base, filename: '  جدول.pdf ', caption: ' مرحبا ' });
    expect(r.success && r.data).toEqual({ ...base, filename: 'جدول.pdf', caption: 'مرحبا' });
  });

  it.each(['', '   ', 'a/b.pdf', 'a\\b.pdf', 'x'.repeat(201), 'a\nb.pdf', 'a\u0000.pdf'])('refuses the name %j', (filename) => {
    expect(threadFileSendSchema.safeParse({ ...base, filename }).success).toBe(false);
  });

  it('refuses a caption over 1024 characters', () => {
    expect(threadFileSendSchema.safeParse({ ...base, filename: 'a.pdf', caption: 'x'.repeat(1025) }).success).toBe(false);
  });
});
