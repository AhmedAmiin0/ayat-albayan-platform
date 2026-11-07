import { describe, expect, it } from 'vitest';
import { isSavedReplyPathOf } from '@/modules/messaging/saved-replies/saved-replies.paths';
import {
  isChatOutPathOf,
  isPathOf,
  isSentFilePath,
  isTeacherAvatarPathOf,
  isUserAvatarPathOf,
} from './storage.paths';

// docs/45: a client sends back the «minio:» path it was given; every ownership check reads the key.
describe('path checks accept a MinIO path exactly like a Supabase one', () => {
  it.each([
    [isPathOf('minio:sub/a.jpg', 'sub'), true],
    [isPathOf('minio:other/a.jpg', 'sub'), false],
    [isPathOf('minio:minio:sub/a.jpg', 'sub'), false],
    [isUserAvatarPathOf('minio:u1/avatar-1.png', 'u1'), true],
    [isTeacherAvatarPathOf('minio:teachers/t1/avatar-1.png', 't1'), true],
    [isChatOutPathOf('minio:out/u1/r1/a.png', { actorId: 'u1', requestId: 'r1' }), true],
    [isSavedReplyPathOf('minio:saved/u1/a.png', 'u1'), true],
    [isSavedReplyPathOf('minio:saved/u2/a.png', 'u1'), false],
  ])('case %#', (got, want) => {
    expect(got).toBe(want);
  });

  it('a sent chat file is out/… in either store, never an inbound cache or a traversal', () => {
    expect(isSentFilePath('out/u/r/a.pdf')).toBe(true);
    expect(isSentFilePath('minio:out/u/r/a.pdf')).toBe(true);
    expect(isSentFilePath('m1.pdf')).toBe(false);
    expect(isSentFilePath('minio:m1.pdf')).toBe(false);
    expect(isSentFilePath('out/../x')).toBe(false);
    expect(isSentFilePath(null)).toBe(false);
  });
});
