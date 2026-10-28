import { describe, expect, it } from 'vitest';
import { avatarPath, BUCKETS, isPathOf, isTeacherAvatarPathOf, isUserAvatarPathOf, teacherAvatarPath } from './storage.paths';

// avatars/<user_id>/avatar-<ms>.<ext> (migration 20261012000370 parses the first segment; R-ACC-05) and
// avatars/teachers/<teacher_id>/avatar-<ms>.<ext> (migration 20261028000942).

describe('avatar path', () => {
  it('puts the photo in the user’s own folder with a timestamped name', () => {
    expect(BUCKETS.avatars).toBe('avatars');
    const path = avatarPath({ userId: 'u1', mime: 'image/webp', now: 1700000000000 });
    expect(path).toBe('u1/avatar-1700000000000.webp');
    expect(isPathOf(path, 'u1')).toBe(true);
    expect(isPathOf(path, 'u2')).toBe(false);
    expect(isUserAvatarPathOf(path, 'u1')).toBe(true);
    expect(isUserAvatarPathOf('u1/receipt.png', 'u1')).toBe(false);
  });

  it('puts a teacher record’s photo under teachers/<id>/ and accepts only that folder', () => {
    const path = teacherAvatarPath({ teacherId: 't1', mime: 'image/png', now: 5 });
    expect(path).toBe('teachers/t1/avatar-5.png');
    expect(isTeacherAvatarPathOf(path, 't1')).toBe(true);
    expect(isTeacherAvatarPathOf(path, 't2')).toBe(false);
    expect(isTeacherAvatarPathOf('t1/avatar-5.png', 't1')).toBe(false);
    expect(isTeacherAvatarPathOf('teachers/t1/x/avatar-5.png', 't1')).toBe(false);
    expect(isTeacherAvatarPathOf('teachers/t1/receipt.png', 't1')).toBe(false);
    expect(isUserAvatarPathOf(path, 'teachers')).toBe(false);
  });
});
